import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Speciality, SpecialityDocument } from './schemas/speciality.schema';
import { buildSpecialityTree, collectDescendantSlugs, findNodeBySlug, SpecialityNode } from 'src/shared/structures/speciality-tree';
import { CreateSpecialityDto } from './dto/create-speciality.dto';
import { UpdateSpecialityDto } from './dto/update-speciality.dto';

/**
 * Cache en memoria: Map simple.
 * TTL manual para evitar stale data sin Redis.
 * Invalidación: explícita en mutaciones (POST/PATCH/DELETE).
 *
 * Complejidad de acceso al cache: O(1) por clave hash.
 */
interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

@Injectable()
export class SpecialitiesService implements OnModuleDestroy {
    private readonly cache = new Map<string, CacheEntry<unknown>>();
    private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
    private cleanupInterval: NodeJS.Timeout;

    constructor(
        @InjectModel(Speciality.name)
        private readonly specialityModel: Model<SpecialityDocument>,
    ) {
        // Limpieza periódica de entradas expiradas — evita memory leak
        this.cleanupInterval = setInterval(
            () => this.evictExpired(),
            this.CACHE_TTL_MS,
        );
    }

    onModuleDestroy() {
        clearInterval(this.cleanupInterval);
    }

    private get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return entry.data as T;
    }

    private set<T>(key: string, data: T): void {
        this.cache.set(key, {
            data,
            expiresAt: Date.now() + this.CACHE_TTL_MS,
        });
    }

    private evictExpired(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) this.cache.delete(key);
        }
    }

    invalidateCache(): void {
        this.cache.clear();
    }

    /**
     * Devuelve el árbol completo de especialidades.
     * Primera llamada: O(n) — consulta DB + buildTree.
     * Llamadas subsiguientes (dentro del TTL): O(1) — cache hit.
     */
    async getSpecialityTree(): Promise<{
        success: boolean;
        tree: SpecialityNode[];
    }> {
        const CACHE_KEY = 'speciality:tree';
        const cached = this.get<SpecialityNode[]>(CACHE_KEY);

        if (cached) {
            return { success: true, tree: cached };
        }

        // Cache miss → reconstruir desde DB
        const flatList = await this.specialityModel
            .find({ active: true })
            .select('_id name slug parentId')
            .lean();

        const normalized = flatList.map((s) => ({
            id: String(s._id),
            name: s.name,
            slug: s.slug,
            parentId: s.parentId ?? null,
        }));

        const tree = buildSpecialityTree(normalized);
        this.set(CACHE_KEY, tree);

        return { success: true, tree };
    }

    async getSpecialityNames(): Promise<{
        success: boolean;
        specialities: { name: string; slug: string }[];
    }> {
        const CACHE_KEY = 'speciality:names';
        const cached = this.get<{ name: string; slug: string }[]>(CACHE_KEY);

        if (cached) return { success: true, specialities: cached };

        const docs = await this.specialityModel
            .find({ active: true })
            .select('name slug')
            .sort({ name: 1 })
            .lean();

        const specialities = docs.map((d) => ({ name: d.name, slug: d.slug }));
        this.set(CACHE_KEY, specialities);

        return { success: true, specialities };
    }

    /**
     * Resuelve todos los slugs de una rama para filtrar doctores.
     * Permite seleccionar "Cirugía" y obtener todos sus subtipos.
     * Complejidad: O(1) cache + O(k) collectDescendants donde k = rama.
     */
    async resolveSpecialitySlugs(slug: string): Promise<string[]> {
        const { tree } = await this.getSpecialityTree();
        const node = findNodeBySlug(tree, slug);

        if (!node) return [slug];
        return collectDescendantSlugs(node);
    }

    async createSpeciality(dto: CreateSpecialityDto): Promise<{ success: boolean }> {
        await this.specialityModel.create(dto);
        this.invalidateCache();
        return { success: true };
    }

    async updateSpeciality(id: string, dto: UpdateSpecialityDto): Promise<{ success: boolean }> {
        await this.specialityModel.findByIdAndUpdate(id, dto);
        this.invalidateCache();
        return { success: true };
    }
}