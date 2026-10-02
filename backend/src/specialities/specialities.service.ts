import {
  BadRequestException,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Speciality, SpecialityDocument } from './schemas/speciality.schema';
import {
  SpecialityFlatNode,
  SpecialityNode,
  buildSpecialityTree,
  collectDescendantSlugs,
  findNodeBySlug,
} from 'src/shared/structures/speciality-tree';
import {
  DomainInvariantError,
  MAX_SPECIALITY_DEPTH,
  assertAcyclic,
  assertMaxDepth,
} from 'src/shared/structures/domain-types';
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

interface ParentRow {
  parentId?: string | null;
}

interface FlatRow {
  _id: unknown;
  parentId?: string | null;
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
   * Devuelve el árbol completo de especialidades + huérfanos reportados.
   * Primera llamada: O(n) — consulta DB + buildTree.
   * Llamadas subsiguientes (dentro del TTL): O(1) — cache hit.
   * Los huérfanos se devuelven con 200 (nunca 400): se reportan, no se pierden.
   */
  async getSpecialityTree(): Promise<{
    success: boolean;
    tree: SpecialityNode[];
    orphans: SpecialityFlatNode[];
    orphanCount: number;
  }> {
    const CACHE_KEY = 'speciality:tree';
    const cached = this.get<{
      tree: SpecialityNode[];
      orphans: SpecialityFlatNode[];
    }>(CACHE_KEY);

    if (cached) {
      return {
        success: true,
        tree: cached.tree,
        orphans: cached.orphans,
        orphanCount: cached.orphans.length,
      };
    }

    // Cache miss → reconstruir desde DB
    const flatList = (await this.specialityModel
      .find({ active: true })
      .select('_id name slug parentId')
      .lean()) as unknown as Array<{
      _id: unknown;
      name: string;
      slug: string;
      parentId?: string | null;
    }>;

    const normalized = flatList.map((s) => ({
      id: String(s._id),
      name: s.name,
      slug: s.slug,
      parentId: s.parentId ?? null,
    }));

    // Traduce invariante tipada a 400 con code estable
    try {
      const { roots, orphans } = buildSpecialityTree(normalized);
      this.set(CACHE_KEY, { tree: roots, orphans });
      return {
        success: true,
        tree: roots,
        orphans,
        orphanCount: orphans.length,
      };
    } catch (e) {
      if (e instanceof DomainInvariantError) {
        throw new BadRequestException({
          message: e.message,
          code: e.code,
        });
      }
      throw e;
    }
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

  async createSpeciality(
    dto: CreateSpecialityDto,
  ): Promise<{ success: boolean }> {
    // El padre debe existir y el nuevo nodo no puede superar maxDepth.
    // Requiere leer la cadena de padres en DB: solo el servicio puede
    // garantizar el 400 (los DTOs no ven la DB aunque haya ValidationPipe).
    if (dto.parentId !== undefined && dto.parentId !== null) {
      const { depth, chain } = await this.getDepthFromDb(dto.parentId, null);
      if (depth + 1 > MAX_SPECIALITY_DEPTH) {
        throw new BadRequestException({
          message:
            `Speciality depth ${depth + 1} exceeds max ` +
            `${MAX_SPECIALITY_DEPTH}: ${[...chain, '(new node)'].join(' -> ')}`,
          code: 'DEPTH_EXCEEDED',
        });
      }
    }
    await this.specialityModel.create(dto);
    this.invalidateCache();
    return { success: true };
  }

  async updateSpeciality(
    id: string,
    dto: UpdateSpecialityDto,
  ): Promise<{ success: boolean }> {
    if (dto.parentId !== undefined) {
      if (dto.parentId !== null) {
        // Ciclo (directo o vía ancestros) y padre inexistente → 400.
        const { depth } = await this.getDepthFromDb(dto.parentId, id);
        if (depth + 1 > MAX_SPECIALITY_DEPTH) {
          throw new BadRequestException({
            message:
              `Speciality depth ${depth + 1} exceeds max ` +
              `${MAX_SPECIALITY_DEPTH} for node '${id}'`,
            code: 'DEPTH_EXCEEDED',
          });
        }
      }
      // Mover un nodo puede empujar a sus descendientes más allá del
      // máximo aunque el nodo quede dentro: se simula y se valida.
      await this.assertSubtreeDepthOk(id, dto.parentId);
    }
    await this.specialityModel.findByIdAndUpdate(id, dto);
    this.invalidateCache();
    return { success: true };
  }

  /**
   * Camina la cadena de padres en DB desde startId hasta la raíz.
   * Devuelve su profundidad (raíz = 0) y la cadena ordenada raíz→padre.
   * Lanza 400 ORPHAN_NODE si un padre no existe, 400 CYCLE_DETECTED si la
   * cadena alcanza selfId (mover un nodo bajo su propio descendiente) o se
   * repite. Coste O(profundidad) lecturas, profundidad ≤ 4 en datos sanos.
   */
  private async getDepthFromDb(
    startId: string,
    selfId: string | null,
  ): Promise<{ depth: number; chain: string[] }> {
    const chain: string[] = [];
    let cur: string | null = startId;
    let depth = 0;
    while (cur !== null) {
      if (cur === selfId || chain.includes(cur)) {
        throw new BadRequestException({
          message:
            'Cycle detected in speciality hierarchy: ' +
            [...chain, cur].join(' -> '),
          code: 'CYCLE_DETECTED',
        });
      }
      chain.push(cur);
      const doc = (await this.specialityModel
        .findById(cur)
        .select('parentId')
        .lean()) as unknown as ParentRow | null;
      if (!doc) {
        throw new BadRequestException({
          message: `Orphan speciality '${startId}': parent '${cur}' not found`,
          code: 'ORPHAN_NODE',
        });
      }
      cur = doc.parentId ?? null;
      if (cur !== null) depth += 1;
    }
    return { depth, chain: chain.reverse() };
  }

  /**
   * Simula el cambio de padre y valida la profundidad de todo el grafo,
   * para que los descendientes del nodo movido tampoco superen el máximo.
   * O(n) sobre el total de especialidades; n es pequeño (decenas).
   */
  private async assertSubtreeDepthOk(
    selfId: string,
    newParentId: string | null,
  ): Promise<void> {
    const docs = (await this.specialityModel
      .find({})
      .select('_id parentId')
      .lean()) as unknown as FlatRow[];
    const flat = docs.map((d) => ({
      id: String(d._id),
      parentId: d.parentId ?? null,
    }));
    if (!flat.some((n) => n.id === selfId)) return;
    const simulated = flat.map((n) =>
      n.id === selfId ? { ...n, parentId: newParentId } : n,
    );
    try {
      assertAcyclic(simulated);
      assertMaxDepth(simulated, MAX_SPECIALITY_DEPTH);
    } catch (e) {
      if (e instanceof DomainInvariantError) {
        throw new BadRequestException({ message: e.message, code: e.code });
      }
      throw e;
    }
  }
}
