package bot

import (
	"fmt"
	"testing"
)

// Los golden cases y el fuzz de esta tabla son idénticos a
// backend/src/tests/validators.spec.ts: cambiar uno implica cambiar ambos.

func TestIsValidSlotDateGolden(t *testing.T) {
	valid := []string{
		"01/01/2026",
		"28/02/2025",
		"29/02/2024",
		"29/02/2000",
		"01/01/0100",
		"30/04/2026",
		"31/07/2025",
		"31/12/2026",
	}
	for _, s := range valid {
		if !IsValidSlotDate(s) {
			t.Errorf("IsValidSlotDate(%q) = false, want true", s)
		}
	}
	invalid := []string{
		"32/13/2026",
		"29/02/2025",
		"29/02/2100",
		"29/02/1900",
		"31/04/2026",
		"31/02/2026",
		"00/01/2026",
		"01/00/2026",
		"01/01/0099",
		"01/01/0026",
		"1/1/26",
		"15/7/2025",
		"2026-01-01",
		"01/01/202",
		"01/01/20266",
		"0a/01/2026",
		"01/01/2026x",
		"011/01/2026",
		"01/01/2026 extra",
		"",
	}
	for _, s := range invalid {
		if IsValidSlotDate(s) {
			t.Errorf("IsValidSlotDate(%q) = true, want false", s)
		}
	}
}

func TestIsValidSlotDateLeapYears(t *testing.T) {
	leaps := []int{1996, 2000, 2016, 2020, 2024, 2048, 2400}
	for _, y := range leaps {
		s := fmt.Sprintf("29/02/%04d", y)
		if !IsValidSlotDate(s) {
			t.Errorf("IsValidSlotDate(%q) = false, want true (leap)", s)
		}
	}
	nonLeaps := []int{1900, 2001, 2023, 2025, 2100, 2200}
	for _, y := range nonLeaps {
		s := fmt.Sprintf("29/02/%04d", y)
		if IsValidSlotDate(s) {
			t.Errorf("IsValidSlotDate(%q) = true, want false (non-leap)", s)
		}
	}
}

func TestIsValidSlotDateFuzz500(t *testing.T) {
	seed := uint32(20261004)
	next := func() uint32 {
		seed = seed*1664525 + 1013904223
		return seed
	}
	nonLeap := []int{2025, 2023, 2021, 2100, 1900, 2026, 2027, 2029}
	months30 := []int{4, 6, 9, 11}
	var accepted []string
	for i := 0; i < 500; i++ {
		r1 := next()
		r2 := next()
		dd := 1 + int(r1%28)
		mm := 1 + int(r1%12)
		yyyy := 1900 + int(r2%300)
		var s string
		switch i % 10 {
		case 0:
			s = fmt.Sprintf("32/%02d/%04d", mm, yyyy)
		case 1:
			s = fmt.Sprintf("%02d/13/%04d", dd, yyyy)
		case 2:
			s = fmt.Sprintf("00/%02d/%04d", mm, yyyy)
		case 3:
			s = fmt.Sprintf("%02d/00/%04d", dd, yyyy)
		case 4:
			s = fmt.Sprintf("29/02/%04d", nonLeap[i%8])
		case 5:
			s = fmt.Sprintf("31/%02d/%04d", months30[i%4], yyyy)
		case 6:
			s = fmt.Sprintf("31/02/%04d", yyyy)
		case 7:
			s = fmt.Sprintf("%d/%d/%04d", 1+int(r1%9), 1+int(r1%9), yyyy)
		case 8:
			s = fmt.Sprintf("%04d-%02d-%02d", yyyy, mm, dd)
		default:
			s = fmt.Sprintf("%02d/%02d/%03d", dd, mm, 100+int(r2%900))
		}
		if IsValidSlotDate(s) {
			accepted = append(accepted, s)
		}
	}
	if len(accepted) != 0 {
		t.Fatalf("fuzz aceptó %d fechas inválidas: %v", len(accepted), accepted)
	}
}

func TestIsValidLang(t *testing.T) {
	for _, s := range []string{"en", "es"} {
		if !IsValidLang(s) {
			t.Errorf("IsValidLang(%q) = false, want true", s)
		}
	}
	for _, s := range []string{"", "EN", "fr", "es-ES", "en-US", "en ", " español"} {
		if IsValidLang(s) {
			t.Errorf("IsValidLang(%q) = true, want false", s)
		}
	}
}

func TestNewEngineNormalisesLang(t *testing.T) {
	cases := map[string]string{
		"":   "en",
		"fr": "en",
		"EN": "en",
		"en": "en",
		"es": "es",
	}
	for in, want := range cases {
		if got := NewEngine(in).language; got != want {
			t.Errorf("NewEngine(%q).language = %q, want %q", in, got, want)
		}
	}
}