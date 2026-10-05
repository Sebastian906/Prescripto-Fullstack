package bot

import "strconv"

// IsValidSlotDate reports whether s is a strict DD/MM/YYYY calendar date.
// Mirror de isSlotDate() en backend/src/shared/utils/validators.ts: ambos
// stacks corren los mismos golden cases y el mismo fuzz sembrado; mantener
// los dos archivos sincronizados.
//
// Capa léxica (el pequeño AFD documentado en el original TS): 10 caracteres,
// dd en 01..31, mm en 01..12 y año de exactamente 4 dígitos.
// Capa semántica: el día debe existir en ese mes, con la regla gregoriana
// de bisiesto (y%4==0 && (y%100!=0 || y%400==0)).
// Años 0000-0099 se rechazan a propósito: en JS Date(y,...) con y<100 se
// interpreta como 1900+y y el round-trip nunca cuadra; Go replica esa
// guarda para preservar la paridad entre stacks.
func IsValidSlotDate(s string) bool {
	if len(s) != 10 || s[2] != '/' || s[5] != '/' {
		return false
	}
	for _, i := range [8]int{0, 1, 3, 4, 6, 7, 8, 9} {
		if s[i] < '0' || s[i] > '9' {
			return false
		}
	}
	dd, _ := strconv.Atoi(s[0:2])
	mm, _ := strconv.Atoi(s[3:5])
	yyyy, _ := strconv.Atoi(s[6:10])
	if mm < 1 || mm > 12 || dd < 1 || dd > 31 {
		return false
	}
	if yyyy < 100 {
		return false
	}
	return dd <= daysInMonth(mm, yyyy)
}

// daysInMonth devuelve los días del mes mm en el año yyyy (gregoriano).
func daysInMonth(mm, yyyy int) int {
	switch mm {
	case 1, 3, 5, 7, 8, 10, 12:
		return 31
	case 4, 6, 9, 11:
		return 30
	case 2:
		if yyyy%4 == 0 && (yyyy%100 != 0 || yyyy%400 == 0) {
			return 29
		}
		return 28
	}
	return 0
}

// IsValidLang reports whether lang is a locale supported by the bot (en|es).
// NewEngine normaliza cualquier otro valor (incluido "") a "en".
func IsValidLang(lang string) bool {
	return lang == "en" || lang == "es"
}