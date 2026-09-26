/**
 * Item ids Google Merchant Center refused under "Firearms and their parts"
 * (Огнестрельное оружие и его детали), exported from the account on 2026-09-26.
 *
 * The rules in lib/merchant-eligibility.ts already drop most of these by
 * category, device type or name; this list also covers the ones Google judged
 * differently from us — clip-on attachments filed as "тепловізор",
 * helmet night-vision, weapon adapters. Resubmitting a refused item risks the
 * account, so it stays out of the feed until Google is asked to re-review it.
 *
 * The products themselves stay on the site — this only limits the feed.
 */
export const MERCHANT_DISAPPROVED_IDS: ReadonlySet<string> = new Set([
  "08454", // Тепловізійний приціл INFIRAY (IRAY) Tube TL35 V2
  "08456", // Тепловізійний приціл INFIRAY (IRAY) Tube TH35 V2
  "08457", // Тепловізійний приціл INFIRAY (IRAY) Tube TH50 V2
  "123-55-A-W", // Кронштейн NVECTECH на Weaver без верхів
  "123-66-A-W", // Швидкоз ємний кронштейн NVECTECH на Weaver без верхів (Алюміній)
  "123-66-T-W", // Швидкоз ємний кронштейн NVECTECH на Weaver без верхів (Титан)
  "123-77-A-W-SCL", // Кронштейн NVECTECH на Weaver під SAIM SCL25/SCL35
  "2RH50R", // Тепловізійний приціл INFIRAY (IRAY) RICO 2 RH50R
  "314204550204R231", // Тепловізійний приціл AGM RATTLER V2 25-384
  "314204550205R331", // Тепловізійний приціл AGM RATTLER V2 35-384
  "314205550205R361", // Тепловізійний приціл AGM RATTLER V2 35-640
  "314205550206R561", // Тепловізійний приціл AGM RATTLER V2 50-640
  "314205560206R561", // Тепловізонна насадка AGM Rattler-C V2 50-640
  "314218550203R921", // Тепловізійний приціл AGM RATTLER V2 19-256
  "314218550204R221", // Тепловізійний приціл AGM RATTLER V2 25-256
  "546", // Тепловізонна насадка INFIRAY (IRAY) Mate MAL25
  "547", // Тепловізонна насадка INFIRAY (IRAY) Mate MAL38
  "76453BW", // Тепловізонна насадка Pulsar Core FXQ38 BW
  "76459BW", // Тепловізонна насадка Pulsar Core FXQ50 BW
  "76541", // Тепловізійний приціл Pulsar Thermion 2 XQ35 Pro
  "76544", // Тепловізійний приціл Pulsar Thermion 2 XP50
  "76545", // Тепловізійний приціл Pulsar Thermion 2 XQ50
  "76546", // Тепловізійний приціл Pulsar Thermion 2 XQ38
  "76547", // Тепловізійний приціл Pulsar Thermion 2 XP50 Pro
  "76548", // Тепловізійний приціл Pulsar Thermion 2 XQ50 Pro
  "76554", // Тепловізійний приціл Pulsar Thermion 2 LRF XP50 Pro
  "76558", // Тепловізійний приціл Pulsar Trail 2 LRF XQ50
  "76559", // Тепловізійний приціл Pulsar Trail 2 LRF XP50
  "76561", // Тепловізійний приціл Pulsar Talion XQ38
  "76571", // Тепловізійний приціл Pulsar Thermion Duo DXP50
  "77375", // Тепловізор Pulsar Krypton XG50
  "77378", // Тепловізор Pulsar Proton XQ30
  "79045", // Кронштейн Weaver для прицілів Pulsar Digisight, Apex, Trail
  "79047", // Кронштейн европризма для прицілів Pulsar Digisight, Apex, Trail
  "79049", // Кронштейн боковий для прицілів Pulsar Digisight, Apex, Trail
  "79125", // Кришка-адаптер Pulsar DN 50 мм
  "79127", // Швидкоз ємний кронштейн Weaver QD112 для прицілів Pulsar Digisight, Ap
  "79161", // Джерело живлення Pulsar APS3 (Axion, Thermion)
  "79177", // Швидкоз ємний кронштейн Pulsar Weaver SQD для прицілів Trail, Digisigh
  "7952", // Тепловізійний приціл Konus FLAME-R 2.5x-20x
  "8888765", // Швидкоз ємний кронштейн NVECTECH на Blaser R8/R93 без верхів
  "A02453", // Тепловізійний приціл HikMicro STELLAR SH35
  "A02454", // Тепловізійний приціл HikMicro STELLAR SH50
  "A02455", // Тепловізійний приціл HikMicro STELLAR SQ35
  "A02456", // Тепловізійний приціл HikMicro STELLAR SQ50
  "A03005", // Тепловізійний приціл HikMicro STELLAR SH35L
  "A03006", // Тепловізійний приціл HikMicro STELLAR SH50L
  "A03007", // Тепловізійний приціл HikMicro STELLAR SQ35L
  "A03008", // Тепловізійний приціл HikMicro STELLAR SQ50L
  "A03160", // Тепловізор INFIRAY (IRAY) UNIQUE UH35
  "A03172", // Тепловізійний приціл INFIRAY (IRAY) TUBE TL50
  "A03195", // Приціл нічного бачення INFIRAY (IRAY) TUBE TD50L
  "A03485", // Тепловізійний приціл HikMicro STELLAR SQ50 2.0
  "A03576", // Тепловізійний приціл INFIRAY (IRAY) TUBE TS60
  "A03585", // Тепловізонна насадка INFIRAY (IRAY) MATE MAH50R
  "A03587", // Приціл нічного бачення INFIRAY (IRAY) TUBE TD70L V2
  "A03620", // Купити насадку нічного бачення PARD FD1 940nm
  "A03622", // Насадка нічного бачення PARD FD1 LRF 940nm
  "A40E", // Приціл нічного бачення HikMicro ALPEX 4K Lite A40E
  "A40EL", // Приціл нічного бачення HikMicro ALPEX 4K Lite A40EL LRF
  "A50E", // Приціл нічного бачення HikMicro ALPEX 4K A50E
  "A50EL", // Приціл нічного бачення HikMicro ALPEX 4K A50EL LRF
  "A50P", // Приціл нічного бачення HikMicro ALPEX PRO A50P
  "A50PL", // Приціл нічного бачення HikMicro ALPEX PRO A50PL LRF
  "AA-0008722", // Тепловізійний приціл AGM RATTLER TS50-640
  "AA-0012297", // Тепловізійний приціл Pulsar Thermion 2 XG50
  "AA-0012300", // Тепловізійний приціл INFIRAY (IRAY) Geni GH50
  "AA-0013013", // Тепловізійний приціл INFIRAY (IRAY) Hybrid HYH75W
  "AA-0013045", // Приціл нічного бачення Pard NV008SP2
  "AA-0013509", // Тепловізійний приціл ThermTec Vidar 325
  "AA-0013513", // Тепловізійний приціл ThermTec Vidar 319
  "ADDE60-1280-2", // Тепловізійний приціл AGM Adder V2 LRF 60-1280
  "AGM Adder V2 35-384", // Тепловізійний приціл AGM Adder V2 35-384
  "AGM Adder V2 LRF 35-384", // Тепловізійний приціл AGM Adder V2 LRF 35-384
  "AGM Adder V2 LRF 35-640", // Тепловізійний приціл AGM Adder V2 LRF 35-640
  "AGM Wolf-14 NL1", // Прилад нічного бачення AGM Wolf-14 NL1
  "AGM Wolf-14 NL2", // Прилад нічного бачення AGM Wolf-14 NL2
  "AGM Wolf-14 NW1", // Прилад нічного бачення AGM Wolf-14 NW1
  "AGM Wolf-14 NW2", // Прилад нічного бачення AGM Wolf-14 NW2
  "AK-BK", // Кронштейн бічний Weaver під рукоядку на АК
  "AM03-35 LRF", // Тепловізійний приціл Sytong AM03-35 LRF
  "AM03-50 LRF", // Тепловізійний приціл Sytong AM03-50 LRF
  "AM06-35", // Тепловізійний приціл Sytong AM06-35
  "AM06-35 LRF", // Тепловізійний приціл Sytong AM06-35 LRF
  "AM06-50 LRF", // Тепловізійний приціл Sytong AM06-50 LRF
  "ARMASIGHT APOLLO 324 (30HZ)", // Тепловізонна насадка ARMASIGHT APOLLO 324 (30HZ) США
  "ARMASIGHT APOLLO 324 (60HZ)", // Тепловізонна насадка ARMASIGHT APOLLO 324 (60HZ) США
  "ARMASIGHT APOLLO 640 (30HZ)", // Тепловізонна насадка ARMASIGHT APOLLO 640 (30HZ) США
  "ARMASIGHT APOLLO 640 (60HZ)", // Тепловізонна насадка ARMASIGHT APOLLO 640 (60HZ) США
  "ARMASIGHT APOLLO MINI 336 (30 HZ)", // Тепловізонна насадка ARMASIGHT APOLLO MINI 336 (30 HZ) США
  "ARMASIGHT APOLLO MINI 336 (60 HZ)", // Тепловізонна насадка ARMASIGHT APOLLO MINI 336 (60 HZ) США
  "ARMASIGHT APOLLO MINI 640 (30 HZ)", // Тепловізонна насадка ARMASIGHT APOLLO MINI 640 (30 HZ) США
  "ARMASIGHT APOLLO MINI 640 (60 HZ)", // Тепловізонна насадка ARMASIGHT APOLLO MINI 640 (60 HZ) США
  "ARMASIGHT APOLLO-PRO LR 640 (30HZ)", // Тепловізонна насадка ARMASIGHT APOLLO-PRO LR 640 (30HZ) США
  "ARMASIGHT APOLLO-PRO LR 640 (60HZ)", // Тепловізонна насадка ARMASIGHT APOLLO-PRO LR 640 (60HZ) США
  "ARMASIGHT APOLLO-PRO MR 336 (30HZ)", // Тепловізійна насадка ARMASIGHT APOLLO-PRO MR 336 (30HZ) США
  "ARMASIGHT APOLLO-PRO MR 640 (30HZ)", // Тепловізійна насадка ARMASIGHT APOLLO-PRO MR 640 (30HZ) США
  "ARMASIGHT APOLLO-PRO MR 640 (60HZ)", // Тепловізонна насадка ARMASIGHT APOLLO-PRO MR 640 (60HZ) США
  "ARMASIGHT Drone Pro 10x", // Приціл нічного бачення ARMASIGHT Drone Pro 10x США
  "ARMASIGHT Drone Pro 15x", // Приціл нічного бачення ARMASIGHT Drone Pro 15x США
  "ARMASIGHT NEMESIS 4X GEN 2+ SD", // Приціл нічного бачення ARMASIGHT NEMESIS 4X GEN 2+ SD США
  "ARMASIGHT NEMESIS 6X GEN 2+ SD", // Приціл нічного бачення ARMASIGHT NEMESIS 6X GEN 2+ SD США
  "ARMASIGHT ORION 5x GEN 1", // Приціл нічного бачення ARMASIGHT ORION 5x GEN 1+ США
  "ARMASIGHT Prometheus 336 3-12x42 (30Hz)", // Тепловізор ARMASIGHT Prometheus 336 3-12x42 (30Hz) США
  "ARMASIGHT Prometheus 336 HD 5-20x75 (30 Hz)", // Тепловізор ARMASIGHT Prometheus 336 HD 5-20x75 (30 Hz) США
  "ARMASIGHT Prometheus 336 HD 5-20x75 (60 Hz)", // Тепловізор ARMASIGHT Prometheus 336 HD 5-20x75 (60 Hz) США
  "ARMASIGHT Prometheus 336 HD 8-32x100 (30 Hz)", // Тепловізор ARMASIGHT Prometheus 336 HD 8-32x100 (30 Hz) США
  "ARMASIGHT Prometheus 640 1-8x25 (30 Hz)", // Тепловізор ARMASIGHT Prometheus 640 1-8x25 (30 Hz) США
  "ARMASIGHT Prometheus 640 2-16x42 (30Hz)", // Тепловізор ARMASIGHT Prometheus 640 2-16x42 (30Hz) США
  "ARMASIGHT Prometheus 640 2-16x42 (60Hz)", // Тепловізор ARMASIGHT Prometheus 640 2-16x42 (60Hz) США
  "ARMASIGHT Prometheus 640 HD 3-24x75 (30 Hz)", // Тепловізор ARMASIGHT Prometheus 640 HD 3-24x75 (30 Hz) США
  "ARMASIGHT Prometheus 640 HD 3-24x75 (60 Hz)", // Тепловізор ARMASIGHT Prometheus 640 HD 3-24x75 (60 Hz) США
  "ARMASIGHT Prometheus-PRO 336 4-16X50 (30 HZ)", // Тепловізор ARMASIGHT Prometheus-PRO 336 4-16X50 (30 HZ) США
  "ARMASIGHT Prometheus-PRO 336 4-16X50 (60 HZ)", // Тепловізор ARMASIGHT Prometheus-PRO 336 4-16X50 (60 HZ) США
  "ARMASIGHT Prometheus-PRO 336 8-32x100 (30 HZ)", // Тепловізор ARMASIGHT Prometheus-PRO 336 8-32x100 (30 HZ) США
  "ARMASIGHT Prometheus-PRO 336 8-32x100 (60 HZ)", // Тепловізор ARMASIGHT Prometheus-PRO 336 8-32x100 (60 HZ) США
  "ARMASIGHT Prometheus-PRO 640 2-16x50 (30 HZ)", // Тепловізор ARMASIGHT Prometheus-PRO 640 2-16x50 (30 HZ) США
  "ARMASIGHT Prometheus-PRO 640 2-16x50 (60 HZ)", // Тепловізор ARMASIGHT Prometheus-PRO 640 2-16x50 (60 HZ) США
  "ARMASIGHT Prometheus-PRO 640 4-32x100 (30 HZ)", // Тепловізор ARMASIGHT Prometheus-PRO 640 4-32x100 (30 HZ) США
  "ARMASIGHT Prometheus-PRO 640 4-32x100 (60 HZ)", // Тепловізор ARMASIGHT Prometheus-PRO 640 4-32x100 (60 HZ) США
  "ARMASIGHT Q14 TIMM 336 1Х (30Hz)", // Тепловізор ARMASIGHT Q14 TIMM 336 1Х (30Hz) США
  "ARMASIGHT Q14 TIMM 336 1Х (60Hz)", // Тепловізор ARMASIGHT Q14 TIMM 336 1Х (60Hz) США
  "ARMASIGHT Q14 TIMM 640 1Х (30Hz)", // Тепловізор ARMASIGHT Q14 TIMM 640 1Х (30Hz) США
  "ARMASIGHT Q14 TIMM 640 1Х (60Hz)", // Тепловізор ARMASIGHT Q14 TIMM 640 1Х (60Hz) США
  "ARMASIGHT VULCAN 4.5X FLAG MG", // Приціл нічного бачення ARMASIGHT VULCAN 4.5X FLAG MG США
  "ARMASIGHT VULCAN 4.5X Gen 3P MG", // Приціл нічного бачення ARMASIGHT VULCAN 4.5X Gen 3P MG США
  "ARMASIGHT VULCAN 4.5X Gen3 Alpha MG", // Приціл нічного бачення ARMASIGHT VULCAN 4.5X Gen3 Alpha MG США
  "ARMASIGHT VULCAN 4.5X Gen3 Bravo MG", // Приціл нічного бачення ARMASIGHT VULCAN 4.5X Gen3 Bravo MG США
  "ARMASIGHT VULCAN 4.5X Gen3 Ghost MG", // Пріціл нічного бачення ARMASIGHT VULCAN 4.5X Gen3 Ghost MG США
  "ARMASIGHT VULCAN 6X FLAG MG", // Приціл нічного бачення ARMASIGHT VULCAN 6X FLAG MG США
  "ARMASIGHT VULCAN 6X GEN 3 ALPHA MG", // Приціл нічного бачення ARMASIGHT VULCAN 6X GEN 3 ALPHA MG США
  "ARMASIGHT VULCAN 6X GEN 3 BRAVO MG", // Приціл нічного бачення ARMASIGHT VULCAN 6X GEN 3 BRAVO MG США
  "ARMASIGHT VULCAN 6X GEN 3 GHOST MG", // Приціл нічного бачення ARMASIGHT VULCAN 6X GEN 3 GHOST MG США
  "ARMASIGHT VULCAN 6X GEN 3P MG", // Приціл нічного бачення ARMASIGHT VULCAN 6X GEN 3Р MG США
  "ARMASIGHT VULCAN 6X GEN2+ SD MG", // Приціл нічного бачення ARMASIGHT VULCAN 6X GEN2 + SD MG США
  "ARMASIGHT VULCAN 8X FLAG MG", // Приціл нічного бачення ARMASIGHT VULCAN 8X FLAG MG США
  "ARMASIGHT VULCAN 8X GEN 3 ALPHA MG", // Приціл нічного бачення ARMASIGHT VULCAN 8X GEN 3 ALPHA MG США
  "ARMASIGHT VULCAN 8X GEN 3 BRAVO MG", // Приціл нічного бачення ARMASIGHT VULCAN 8X GEN 3 BRAVO MG США
  "ARMASIGHT VULCAN 8X GEN 3 GHOST MG", // Приціл нічного бачення ARMASIGHT VULCAN 8X GEN 3 GHOST MG США
  "ARMASIGHT VULCAN 8X GEN 3P MG", // Приціл нічного бачення ARMASIGHT VULCAN 8X GEN 3Р MG США
  "ARMASIGHT VULCAN 8X GEN2+ SD MG", // Приціл нічного бачення ARMASIGHT VULCAN 8X GEN2 + SD MG США
  "ARMASIGHT Vampire 3X CORE IIT", // Приціл нічного бачення ARMASIGHT Vampire 3X CORE IIT США
  "ARMASIGHT WWZ 4x GEN 1+", // Приціл нічного бачення ARMASIGHT WWZ 4x GEN 1+ США
  "ARMASIGHT ZEUS 336 3-12X42 (60HZ)", // Тепловізійний приціл ARMASIGHT ZEUS 336 3-12X42 (60HZ) США
  "ARMASIGHT ZEUS 640 2-16X42 (60HZ)", // Тепловізійний приціл ARMASIGHT ZEUS 640 2-16X42 (60HZ) США
  "ARMASIGHT ZEUS 640 3-24X75 (60HZ)", // Тепловізійний приціл ARMASIGHT ZEUS 640 3-24X75 (60HZ) США
  "ARMASIGHT ZEUS-PRO 336 4-16X50 (60 HZ)", // Тепловізійний приціл ARMASIGHT ZEUS-PRO 336 4-16X50 (60 HZ) США
  "ARMASIGHT ZEUS-PRO 336 8-32X100 (60 HZ)", // Тепловізійний приціл ARMASIGHT ZEUS-PRO 336 8-32X100 (60 HZ) США
  "ARMASIGHT ZEUS-PRO 640 2-16X50 (60 HZ)", // Тепловізійний приціл ARMASIGHT ZEUS-PRO 640 2-16X50 (60 HZ) США
  "ARMASIGHT ZEUS-PRO 640 4-32X100 (60 HZ)", // Тепловізійний приціл ARMASIGHT ZEUS-PRO 640 4-32X100 (60 HZ) США
  "ATN MARS 4 384 1.25-5x", // Тепловізійний приціл ATN MARS 4 384 1.25-5x (Велика Британія)
  "ATN MARS 4 384 2-8x", // Тепловізійний приціл ATN MARS 4 384 2-8x (Велика Британія)
  "ATN MARS 4 384 4.5-18x", // Тепловізійний приціл ATN MARS 4 384 4.5-18x (ВеликаБританія)
  "ATN MARS 4 384 7-28x", // Тепловізійний приціл ATN MARS 4 384 7-28x (Велика Британія)
  "ATN MARS 4 640 1-10x", // Тепловізійний приціл ATN MARS 4 640 1-10x (Велика Британія)
  "ATN MARS 4 640 1.5-15x", // Тепловізійний приціл ATN MARS 4 640 1.5-15x (Велика Британія)
  "ATN MARS 4 640 2.5-25x", // Тепловізійний приціл ATN MARS 4 640 2.5-25x (Велика Британія)
  "ATN MARS 4 640 4-40x", // Тепловізійний приціл ATN MARS 4 640 4-40x (Велика Британія)
  "ATN MARS 5 320 3-12X", // Тепловізійний приціл ATN MARS 5 320 3-12X
  "ATN MARS 5 320 4-16X", // Тепловізійний приціл ATN MARS 5 320 4-16X
  "ATN MARS 5 320 5-20X", // Тепловізійний приціл ATN MARS 5 320 5-20X
  "ATN MARS 5 640 2-16X", // Тепловізійний приціл ATN MARS 5 640 2-16X
  "ATN MARS 5 640 3-24X", // Тепловізійний приціл ATN MARS 5 640 3-24X
  "ATN MARS 5 640 4-32X", // Тепловізійний приціл ATN MARS 5 640 4-32X
  "ATN MARS 5 640 5-40Х", // Тепловізійний приціл ATN MARS 5 640 5-40Х
  "ATN MARS 5 LRF 320 3-12X", // Тепловізійний приціл ATN MARS 5 LRF 320 3-12X
  "ATN MARS 5 LRF 320 4-16X", // Тепловізійний приціл ATN MARS 5 LRF 320 4-16X
  "ATN MARS 5 LRF 320 5-20X", // Тепловізійний приціл ATN MARS 5 LRF 320 5-20X
  "ATN MARS 5 LRF 640 2-16X", // Тепловізійний приціл ATN MARS 5 LRF 640 2-16X
  "ATN MARS 5 LRF 640 3-24X", // Тепловізійний приціл ATN MARS 5 LRF 640 3-24X
  "ATN MARS 5 LRF 640 4-32X", // Тепловізійний приціл ATN MARS 5 LRF 640 4-32X
  "ATN MARS 5 LRF 640 5-40", // Тепловізійний приціл ATN MARS 5 LRF 640 5-40
  "ATN MARS 5 XD 2-20X", // Тепловізійний приціл ATN MARS 5 XD 2-20X
  "ATN MARS 5 XD 3-30X", // Тепловізійний приціл ATN MARS 5 XD 3-30X
  "ATN MARS 5 XD 4-40X", // Тепловізійний приціл ATN MARS 5 XD 4-40X
  "ATN MARS 5 XD LRF 2-20X", // Тепловізійний приціл ATN MARS 5 XD LRF 2-20X
  "ATN MARS 5 XD LRF 3-30X", // Тепловізійний приціл ATN MARS 5 XD LRF 3-30X
  "ATN MARS 5 XD LRF 4-40X", // Тепловізійний приціл ATN MARS 5 XD LRF 4-40X
  "ATN MARS LT 160 3-6x", // Тепловізійний приціл ATN MARS LT 160 3-6x
  "ATN MARS LT 160 4-8x", // Тепловізійний приціл ATN MARS LT 160 4-8x
  "ATN MARS LT 320 2-4X", // Тепловізійний приціл ATN MARS LT 320 2-4X
  "ATN MARS LT 320 3-6X", // Тепловізійний приціл ATN MARS LT 320 3-6X
  "ATN MARS LT 320 4-8X", // Тепловізійний приціл ATN MARS LT 320 4-8X
  "ATN MARS LT 320 5-10X", // Тепловізійний приціл ATN MARS LT 320 5-10X
  "ATN MARS LTV 640 3-9X", // Тепловізійний приціл ATN MARS LTV 640 3-9X
  "ATN MARS LTV 640 4-12X", // Тепловізійний приціл ATN MARS LTV 640 4-12X
  "ATN MARS-HD 384 1.25-5x", // Тепловізійний приціл ATN MARS-HD 384 1.25-5X США
  "ATN MARS-HD 384 2-8x", // Тепловізійний приціл ATN MARS-HD 384 2-8x США
  "ATN MARS-HD 384 4.5-18X", // Тепловізійний приціл ATN MARS-HD 384 4.5-18X США
  "ATN MARS-HD 384 9-36X", // Тепловізійний приціл ATN MARS-HD 384 9-36X США
  "ATN MARS-HD 640 1-10X", // Тепловізійний приціл ATN MARS-HD 640 1-10X США
  "ATN MARS-HD 640 1.5-15X", // Тепловізійний приціл ATN MARS-HD 640 1.5-15X США
  "ATN MARS-HD 640 2.5-25X", // Тепловізійний приціл ATN MARS-HD 640 2.5-25X США
  "ATN MARS-HD 640 5-50X", // Тепловізійний приціл ATN MARS-HD 640 5-50X США
  "ATN OTS-HD 384 4.5-18X", // Тепловізор ATN OTS-HD 384 4.5-18X США
  "ATN OTS-HD 640 1-10X", // Тепловізор ATN OTS-HD 640 1-10X США
  "ATN OTS-X-E350 4X (60HZ)", // Тепловізор ATN OTS-X-E350 4X (60HZ) США
  "ATN Power Weapon Kit", // Джерело зовнішнього живлення ATN Power Weapon Kit
  "ATN TICO-336A (60Hz)", // Тепловізійна насадка ATN TICO-336A (60Hz) США
  "ATN TICO-640B (30Hz)", // Тепловізійна насадка ATN TICO-640B (30Hz) США
  "ATN X-Sight 4K BH 5-20X", // Цифровий пріціл ATN X-Sight 4K BUCKHUNTER 5-20X
  "ATN X-Sight 4K Pro 3-14X", // Цифровий приціл день / ніч ATN X-Sight 4K Pro 3-14X
  "ATN X-Sight 4K Pro 5-20X", // Цифровий приціл день / ніч ATN X-Sight 4K Pro 5-20X
  "ATN X-Sight II HD 3-14x", // Цифровий приціл нічного бачення ATN X-Sight II HD 3-14x
  "ATN X-Sight II HD 5-20Х", // Цифровий приціл нічного бачення ATN X-Sight II HD 5-20Х
  "ATN-XS4K", // Приціл нічного бачення ATN X-Sight 4K Pro
  "ATS35-384", // Тепловізійний приціл AGM Adder TS35-384
  "Ace H50", // Тепловізійний приціл Nocpix (IRay) Ace H50
  "Ace H50R", // Тепловізійний приціл Nocpix (IRay) Ace H50R
  "Ace L35", // Тепловізійний приціл Nocpix (IRay) Ace L35
  "Ace S60R", // Тепловізійний приціл Nocpix (IRay) Ace S60R
  "Ares 335", // Тепловізійний приціл ThermTec Ares 335
  "Ares 335 2.0", // Тепловізійний приціл ThermTec Ares 335 2.0
  "Ares 335 LRF", // Тепловізійний приціл ThermTec Ares 335 LRF
  "Ares 335 LRF 2.0", // Тепловізійний приціл ThermTec Ares 335 LRF 2.0
  "Ares 360", // Тепловізійний приціл ThermTec Ares 360
  "Ares 360 2.0", // Тепловізійний приціл ThermTec Ares 360 2.0
  "Ares 360 LRF", // Тепловізійний приціл ThermTec Ares 360 LRF
  "Ares 360 LRF 2.0", // Тепловізійний приціл ThermTec Ares 360 LRF 2.0
  "Ares 4 – CGT", // Приціл нічного бачення ATN Ares 4 - CGT США
  "Ares 635", // Тепловізійний приціл ThermTec Ares 635
  "Ares 635 LRF", // Тепловізійний приціл ThermTec Ares 635 LRF
  "Ares 650 2.0", // Тепловізійний приціл ThermTec Ares 650 2.0
  "Ares 650 2.0 LRF", // Тепловізійний приціл ThermTec Ares 650 2.0 LRF
  "Ares 660", // Тепловізійний приціл ThermTec Ares 660
  "Ares 660 2.0", // Тепловізійний приціл ThermTec Ares 660 2.0
  "Ares 660 LRF", // Тепловізійний приціл ThermTec Ares 660 LRF
  "Ares 660 LRF 2.0", // Тепловізійний приціл ThermTec Ares 660 LRF 2.0
  "Axion LRF XQ38", // Тепловізор Pulsar Axion LRF XQ38
  "Bolt L35R", // Тепловізійний приціл Nocpix (IRay) Bolt L35R
  "Bolt P25R", // Тепловізійний приціл Nocpix (IRay) Bolt P25R
  "C425", // Тепловізійний приціл Dahua C425
  "C435", // Тепловізійний приціл Dahua C435
  "C650", // Тепловізійний приціл Dahua C650
  "CH50 V2", // Тепловізонна насадка INFIRAY (IRAY) CLIP CH50 V2
  "CL42", // Тепловізонна насадка INFIRAY (IRAY) CLIP CL42
  "CLAR25-384", // Тепловізійний приціл AGM Clarion 384
  "CLAR35-640", // Тепловізійний приціл AGM Clarion 640
  "CML25", // Тепловізонна насадка INFIRAY (IRAY) CLIP CML25
  "CTP13", // Тепловізонна насадка INFIRAY (IRAY) CLIP CTP13
  "Cono Tech Vagon 335", // Тепловізійний приціл Cono Tech Vagon 335
  "Cono Tech Vagon 350", // Тепловізійний приціл Cono Tech Vagon 350
  "Cono Tech Vagon 350 LRF", // Тепловізійний приціл Cono Tech Vagon 350 LRF
  "Cono Tech Vagon 635 LRF", // Тепловізійний приціл Cono Tech Vagon 635 LRF
  "Contessa Blaser ATN", // Швидкоз ємний кронштейн Contessa Blaser ATN
  "Contessa Picatinny ATN", // Швидкоз ємний кронштейн Contessa Picatinny ATN
  "DEM-NVEC", // Кронштей-демфер Nvectech для прицілів Defender
  "DGWSXS309LTV", // Приціл нічного бачення ATN X-Sight LTV 3-9X
  "DGWSXS3155LRF", // Приціл нічного бачення ATN X-Sight 5 LRF 3-15x
  "DGWSXS3155P", // Приціл нічного бачення ATN X-Sight 5 3-15x
  "DGWSXS515LTV", // Приціл нічного бачення ATN X-Sight LTV 5-15X
  "DGWSXS5255LRF", // Приціл нічного бачення ATN X-Sight 5 LRF 5-25x
  "DGWSXS5255P", // Приціл нічного бачення ATN X-Sight 5 5-25x
  "Dali RS519-384", // Тепловізійний приціл Dali RS519-384
  "Dali RS535-384L", // Тепловізійний приціл Dali RS535-384L
  "Delta TWS 35", // Тепловізійний прицлі Delta TWS35
  "Delta TWS 35 LRF", // Тепловізійний приціл Delta TWS 35 LRF
  "Delta TWS 35 XL", // Тепловізійний приціл Delta TWS35 XL
  "Delta TWS 35 XL/LRF", // Тепловізійний приціл Delta TWS 35 XL/LRF
  "Delta TWS 50 LRF", // Тепловізійний приціл Delta TWS 50 LRF
  "Delta TWS 50 XL/LRF", // Тепловізійний приціл Delta TWS 50 XL/LRF
  "Delta TWS PRO LRF", // Тепловізійний приціл Delta TWS PRO LRF
  "Delta TWS50", // Тепловізійний приціл Delta TWS50
  "Delta TWS50 XL", // Тепловізійний приціл Delta TWS50 XL
  "Dipol-AM8 PRO", // Монокуляр нічного бачення Dipol AM8 PRO
  "EVOL60-1280-LRF", // Тепловізійний приціл AGM EVOLVER LRF 1280
  "FLIR RS32 1.25-5X19 (60HZ)", // Тепловізійний приціл FLIR RS32 1.25-5X19 (60HZ) США
  "FLIR RS32 4-16X60 (60HZ)", // Тепловізійний приціл FLIR RS32 4-16X60 (60HZ) США
  "FLIR RS64 1.1-9X35 (30HZ)", // Тепловізійний приціл FLIR RS64 1.1-9X35 (30HZ) США
  "FLIR RS64 2-16X60 (30HZ)", // Тепловізійний приціл FLIR RS64 2-16X60 (30HZ) США
  "GENI GH50R", // Тепловізійний приціл INFIRAY (IRAY) GENI GH50R
  "GENI GL35", // Тепловізійний приціл INFIRAY (IRAY) GENI GL35
  "GENI GL35R", // Тепловізійний приціл INFIRAY (IRAY) GENI GL35R
  "GENI GL50R", // Тепловізійний приціл INFIRAY (IRAY) GENI GL50R
  "Guide TD210", // Тепловізор Guide TD210
  "Guide TD433 Gen3", // Тепловізор Guide TD433 Gen3
  "Guide TD435S Gen3", // Тепловізор Guide TD435S Gen3
  "Guide TD633 Gen3", // Тепловізор Guide TD633 Gen3
  "Guide TD633L Gen3", // Тепловізор Guide TD633L Gen3
  "Guide TD635S Gen3", // Тепловізор Guide TD635S Gen3
  "Guide TD650LS Gen3", // Тепловізор Guide TD650LS Gen3
  "Guide TD650S Gen3", // Тепловізор Guide TD650S Gen3
  "Guide TD653 Gen3", // Тепловізор Guide TD653 Gen3
  "Guide TD653L Gen3", // Тепловізор Guide TD653L Gen3
  "H50R", // Тепловізійний приціл Nocpix (Iray) Rico 2 H50R
  "H75R", // Тепловізійний приціл Nocpix (Iray) Rico 2 H75R
  "HM-TR12-19XG/W-TE19", // Тепловізійний приціл Hikmicro Thunder Pro TE19
  "HM-TR12-19XG/W-TE19C", // Тепловізійна насадка Hikmicro Thunder TE19C
  "HM-TR12-25XG/W-TE25", // Тепловізійний приціл Hikmicro Thunder Pro TE25
  "HM-TR13-25XF/W-TH25", // Тепловізійний приціл HikMicro Thunder TH25
  "HM-TR13-35XF/W-TH35", // Тепловізійний приціл HikMicro Thunder TH35
  "HM-TR16-35XG/W-TQ35", // Тепловізійний приціл HikMicro Thunder TQ35
  "HM-TR16-50XG/W-TQ50", // Тепловізійний приціл Hikmicro Thunder Pro TQ50
  "HM-TR16-50XG/W-TQ50C", // Тепловізійна насадка Hikmicro Thunder Pro TQ50
  "HM-TR23-35XG/WL-PH35L", // Тепловізійний приціл HikMicro Panther PH35L LRF
  "HM-TR23-50XG/WL-PH50L", // Тепловізійний приціл HikMicro Panther PH50L LRF
  "HM-TR26-35XG/WL-PQ35L", // Тепловізійний приціл HikMicro Panther PQ35L LRF
  "HM-TR26-50XG/WL-PQ50L", // Тепловізійний приціл HikMicro Panther PQ50L LRF
  "HM-TR3D-50Q/WV-A50T", // Приціл нічного бачення HikMicro ALPEX A50T
  "HM-TR3D-50Q/WV-A50TL", // Приціл нічного бачення HikMicro ALPEX A50TL
  "HM-TR3D-50Q/WV-A50TN", // Приціл нічного бачення HikMicro ALPEX A50TN
  "HM-TR52-19S1G/CW-TE19C 2.0", // Тепловізійна насадка HikMicro THUNDER TE19CR 2.0 (HM-TR52-19S1G/CW-TE1
  "HM-TR52-19S1G/W-TE19 2.0", // Тепловізійний приціл HikMicro THUNDER TE19 2.0
  "HM-TR52-25S1G/W-TE25 2.0", // Тепловізійний приціл HikMicro THUNDER TE25 2.0
  "HM-TR53-25S1G/W-TH25P 2.0", // Тепловізійний приціл HikMicro THUNDER TH25P 2.0
  "HM-TR53-35S1G/CW-TH35PC 2.0", // Тепловізійна насадка HikMicro THUNDER TH35PC 2.0 (HM-TR53-35S1G/CW-TH3
  "HM-TR53-35S1G/W-TH35PC 2.0", // Тепловізійна насадка HikMicro THUNDER TH35PCR 2.0 (HM-TR53-35S1G/W-TH3
  "HM-TR56-35S1G/CW-TQ35C 2.0", // Тепловізійна насадка HikMicro THUNDER TQ35C 2.0 (HM-TR56-35S1G/CW-TQ35
  "HM-TR56-35S1G/CW-TQ35CR 2.0", // Тепловізійна насадка HikMicro THUNDER TQ35CR 2.0 (HM-TR56-35S1G/W-TQ35
  "HM-TR56-35S1G/W-TQ35 2.0", // Тепловізійний приціл HikMicro THUNDER TQ35 2.0
  "HM-TR56-50S1G/CW-TQ50C 2.0", // Тепловізійна насадка Hikmicro Thunder TQ50C 2.0 (HM-TR56-50S1G/CW-TQ50
  "HM-TR56-50S1G/CW-TQ50CR 2.0", // Тепловізійна насадка HikMicro THUNDER TQ50CR 2.0 (HM-TR56-50S1G/W-TQ50
  "HM-TR56-50S1G/W-TQ50 2.0", // Тепловізійний приціл HikMicro THUNDER TQ50 2.0
  "HT-60", // Приціл нічного бачення Sytong HT-60
  "HT-60 LRF", // Приціл нічного бачення Sytong HT-60 LRF
  "HYH35W", // Тепловізійний приціл INFIRAY (IRAY) HYH35W
  "HYH50W", // Тепловізійний приціл INFIRAY (IRAY) HYH50W
  "HYL50W", // Тепловізійний приціл INFIRAY (IRAY) Hybrid Series HYL50W
  "Hunt-Pro 35", // Тепловізійний приціл PARD Hunt-Pro 35
  "Hunt-Pro 35 LRF", // Тепловізійний приціл Pard Hunt-Pro 35 LRF
  "INFIRAY (iRay) Fast FAL 19 1x34D", // Тепловізійний двоканальний коліматор INFIRAY (iRay) Fast FAL 19 1x34D
  "INFIRAY Saim SCL25", // Тепловізійний приціл INFIRAY Saim SCL25
  "INFIRAY Saim SCP19", // Тепловізійний приціл INFIRAY (IRAY) Saim SCP19
  "INFIRAY Saim SCP19W", // Тепловізійний приціл INFIRAY (IRAY) Saim SCP19W
  "INFIRAY XSIGHT SH50", // Тепловізійний приціл INFIRAY XSIGHT SH50
  "INFIRAY XSIGHT SH75", // Тепловізійний приціл INFIRAY XSIGHT SH75
  "INFIRAY XSIGHT SL35", // Тепловізійний приціл INFIRAY XSIGHT SL35
  "INFIRAY XSIGHT SL50", // Тепловізійний приціл INFIRAY XSIGHT SL50
  "INFIRAY XSIGHT SL50R", // Тепловізійний приціл INFIRAY XSIGHT SL50R
  "IRAY Saim SCH50", // Тепловізійний приціл INFIRAY (IRAY) Saim SCH50
  "IRAY Saim SCL35", // Тепловізійний приціл INFIRAY Saim SCL35
  "IRAY Saim SCL35W", // Тепловізійний приціл INFIRAY Saim SCL35W
  "IRAY XEYE 2 E6 PLUS V2", // Тепловізор INFIRAY (IRAY) XEYE 2 E6 + V2
  "IRAY XHOLO HP13", // Тепловізійний коліматор IRAY XHOLO HP13
  "Ibex 335L", // Тепловізійний приціл ThermTec Ibex 335L
  "J-ARM-14", // Адаптер J-ARM для PVS-14 від AGM
  "Konus NV-2 3-9x50", // Цифровий пріціл Konus NV-2 3-9x50
  "Konus NV-3 3-9x32", // Цифровий пріціл Konus NV-3 3-9x32
  "Krypton 2 FXG50", // Тепловізійна насадка Pulsar Krypton 2 FXG50
  "Krypton 2 FXQ35", // Тепловізійна насадка Pulsar Krypton 2 FXQ35
  "Krypton FXG50", // Тепловізійна насадка Pulsar Krypton FXG50
  "L42R", // Тепловізійний приціл Nocpix (Iray) Rico 2 L42R
  "LRF-TS35-384", // Тепловізійний приціл AGM VARMINT LRF TS35-384
  "LRF-TS35-640", // Тепловізійний приціл AGM VARMINT LRF TS35-640
  "LRF-TS50-384", // Тепловізійний приціл AGM VARMINT LRF TS50-384
  "LRF-TS50-640", // Тепловізійний приціл AGM VARMINT LRF TS50-640
  "Lahoux LVS-14 Gen 3", // Прилад нічного бачення Lahoux LVS-14 Gen 3
  "Leupold-LTO-Tracker-2", // Тепловізор Leupold LTO Tracker 2
  "Lumi H35R", // Тепловізор Nocpix (IRay) Lumi H35R
  "Lumi L19", // Тепловізор Nocpix (IRay) Lumi L19
  "Lumi P13", // Тепловізор Nocpix (IRay) Lumi P13
  "MAH50", // Тепловізонна насадка INFIRAY (IRAY) MAH50
  "MAL25", // Тепловізонна насадка INFIRAY (IRAY) MAL25
  "MAL38", // Тепловізонна насадка INFIRAY (IRAY) MAL38
  "MINI MH25", // Тепловізор INFIRAY (IRAY) MINI MH25
  "MINI MH25 V2", // Тепловізор INFIRAY (IRAY) MINI MH25 V2
  "MINI ML19", // Тепловізор INFIRAY (IRAY) MINI ML19
  "MSLTV112X", // Тепловізійний приціл ATN MARS LTV 160 3-9x (08486)
  "MSLTV119X", // Тепловізійний приціл ATN MARS LTV 160 5-15x (08487)
  "MSLTV319X", // Тепловізійний приціл ATN MARS LTV 320 3-9x (08488)
  "MSLTV325X", // Тепловізійний приціл ATN MARS LTV 320 4-12x (08489)
  "MSLTV335X", // Тепловізійний приціл ATN MARS LTV 320 5-15x (08490)
  "MSLTV625X", // Тепловізійний приціл ATN MARS LTV 640 2-6x (08491)
  "NE25", // Тепловізійний приціл HikMicro NEOS NE25
  "NH25L", // Тепловізійний приціл HikMicro NEOS NH25L
  "NH35L", // Тепловізійний приціл HikMicro NEOS NH35L
  "NV-S450CL", // Цифровий приціл день/ніч PARD NV-S450CL 4K
  "NV-S470CL", // Цифровий приціл PARD NV-S470CL
  "NVECTECH DEFENDER 319", // Тепловізійний приціл NVECTECH DEFENDER 319
  "NVECTECH DEFENDER 325", // Тепловізійний приціл NVECTECH DEFENDER 325
  "NVECTECH DEFENDER 335", // Тепловізійний приціл NVECTECH DEFENDER 335
  "NVECTECH DEFENDER 335 L", // Тепловізійний приціл NVECTECH DEFENDER 335 L
  "NVECTECH DEFENDER 360 L", // Тепловізійний приціл NVECTECH DEFENDER 360 L
  "NVECTECH DEFENDER 660 L", // Тепловізійний приціл NVECTECH DEFENDER 660 L
  "NVECTech S50", // Тепловізійний приціл NVECTech S50
  "NVECTech S75", // Тепловізійний приціл NVECTech S75
  "NVECTech SCL25", // Тепловізійний приціл NVECTech SCL25
  "NVECTech SCL35", // Тепловізійний приціл NVECTech SCL35
  "NVECTech X35", // Тепловізійний приціл NVECTech X35
  "NVECTech X50", // Тепловізійний приціл NVECTech X50
  "NVECTech X50R", // Тепловізійний приціл NVECTech X50R
  "Night Arrow 335", // Тепловізійний приціл Cono Tech Night Arrow 335
  "Night Arrow 350", // Тепловізійний приціл Cono Tech Night Arrow 350
  "ORYX-L 635", // Тепловізійний приціл ThermTec ORYX-L 635
  "ORYX-L 650", // Тепловізійний приціл ThermTec ORYX-L 650
  "OWL-NV L3", // Приціл нічного бачення OWL-NV L3
  "OWL-NV L3 LRF", // Приціл нічного бачення OWL-NV L3 LRF
  "Ocelot 256-19", // Тепловізійний приціл PARD Ocelot 256-19
  "Ocelot 480-35 LRF", // Тепловізійний приціл PARD Ocelot 480-35 LRF
  "Ocelot 480-35 LRF Q", // Тепловізійний приціл PARD Ocelot 480-35 LRF Q
  "Ocelot 480-50 LRF", // Тепловізійний приціл PARD Ocelot 480-50 LRF
  "Ocelot 480-50 LRF Q", // Тепловізійний приціл PARD Ocelot 480-50 LRF Q
  "Ocelot 640-50 LRF", // Тепловізійний приціл PARD Ocelot 640-50 LRF
  "Ocelot 640-50 LRF Q", // Тепловізійний приціл PARD Ocelot 640-50 LRF Q
  "PARD NV007 P", // Насадка нічного бачення PARD NV007 P
  "PARD NV007 S", // Цифровий приціл-насадка нічного бачення PARD NV007 S
  "PARD NV007V", // Цифровий приціл-насадка нічного бачення PARD NV007V
  "PH35L 2.0", // Тепловізійний приціл HikMicro Panther PH35L 2.0 LRF
  "PH50L 2.0", // Тепловізійний приціл HikMicro Panther PH50L 2.0 LRF
  "PM03-35", // Тепловізійний приціл Sytong PM03-35
  "PM03-50", // Тепловізійний приціл Sytong PM03-50
  "PQ35L 2.0", // Тепловізійний приціл HikMicro Panther PQ35L 2.0 LRF
  "PQ50L 2.0", // Тепловізійний приціл HikMicro Panther PQ50L 2.0 LRF
  "PULSAR APEX LRF XD38", // Тепловізійний приціл PULSAR APEX LRF XD38
  "PULSAR APEX LRF XD50", // Тепловізійний приціл PULSAR APEX LRF XD50
  "PULSAR APEX LRF XD75", // Тепловізійний приціл PULSAR APEX LRF XD75
  "PULSAR APEX XD38", // Тепловізійний приціл PULSAR APEX XD38 (50Hz) Литва
  "PULSAR APEX XD50", // Тепловізійний приціл PULSAR APEX XD50 (50Hz) Литва
  "PULSAR APEX XD75", // Тепловізійний приціл PULSAR APEX XD75 (50Hz) Литва
  "PVS-14 Mini", // Прилад нічного бачення IRAY PVS-14 Mini
  "PVS14-51 NW1", // Прилад нічного бачення AGM PVS14-51 NW1
  "Pantera 2.0 640-75 LRF", // Тепловізійний приціл Pard Pantera 2.0 640-75 LRF
  "Pantera 256-25 Q", // Тепловізійний приціл Pard Pantera 256-25 Q
  "Pantera 480-35", // Тепловізійний приціл Pard Pantera 480-35
  "Pantera 480-35 LRF", // Тепловізійний приціл Pard Pantera 480-35 LRF
  "Pantera 480-50", // Тепловізійний приціл Pard Pantera 480-50
  "Pantera 480-50 LRF", // Тепловізійний приціл Pard Pantera 480-50 LRF
  "Pantera 640-50 LRF", // Тепловізійний приціл Pard Pantera 640-50 LRF
  "Pantera 640-75 LRF", // Тепловізійний приціл Pard Pantera 640-75 LRF
  "Pantera eX 640-50 LRF Q", // Тепловізійний приціл Pard Pantera eX 640-50 LRF Q
  "Pard DS35-70R 940", // Приціл нічного бачення Pard DS35-70R 940нм
  "Pard FT34 LRF", // Тепловізійна насадка PARD FT34 LRF
  "Pard Landsat 480C", // Тепловізійний приціл Pard Landsat 480C
  "Pard Landsat 640C", // Тепловізійний приціл Pard Landsat 640C
  "Pard Landsat-480-35-50 -LRF-940", // Тепловізійний приціл PARD Landsat-480-35-50 LRF 940
  "Pard Landsat-640-45-50-LRF-940", // Тепловізійний приціл PARD Landsat-640-45-50 LRF 940
  "Pard NV008", // Приціл нічного бачення Pard NV008
  "Pard NV008 LRF", // Приціл нічного бачення Pard NV008 LRF
  "Pard NV008S", // Приціл нічного бачення Pard NV008S
  "Pard NV008SP2 LRF", // Приціл нічного бачення Pard NV008SP2 LRF
  "Pard Night Stalker 4K", // Приціл нічного бачення PARD NS4 Night Stalker 4K
  "Pard Night Stalker Mini 35", // Приціл нічного бачення PARD Night Stalker Mini 35
  "Pard TL3-850", // Інфрачервоний ліхтар Pard TL3-850
  "Predator 480 LRF", // Тепловізійна насадка PARD Predator 480 LRF
  "Predator 640 LRF", // Тепловізійна насадка PARD Predator 640 LRF
  "Pulsar Accolade XQ38", // Тепловізійний бінокль Pulsar Accolade XQ38
  "Pulsar Apex LRF XQ38", // Тепловізійний приціл Pulsar Apex LRF XQ38
  "Pulsar Apex LRF XQ50", // Тепловізійний приціл Pulsar Apex LRF XQ50
  "Pulsar CORE FXQ35", // Тепловізонна насадка/монокуляр Pulsar CORE FXQ35
  "Pulsar CORE FXQ38", // Тепловізонна насадка/монокуляр Pulsar CORE FXQ38
  "Pulsar CORE FXQ50", // Тепловізонна насадка/монокуляр Pulsar CORE FXQ50
  "Pulsar CORE FXQ55", // Тепловізонна насадка/монокуляр Pulsar CORE FXQ55
  "Pulsar Digex C50", // Приціл нічного бачення Pulsar Digex C50
  "Pulsar Digex N455", // Приціл нічного бачення Pulsar Digex N455
  "Pulsar Digisight LRF N870", // Цифровий приціл нічного бачення Pulsar Digisight LRF N870
  "Pulsar Digisight LRF N960", // Цифровий приціл нічного бачення Pulsar Digisight LRF N960
  "Pulsar Digisight LRF N970", // Цифровий приціл нічного бачення Pulsar Digisight LRF N970
  "Pulsar Digisight N960", // Цифровий приціл нічного бачення Pulsar Digisight N960
  "Pulsar Digisight N970", // Цифровий приціл нічного бачення Pulsar Digisight N970
  "Pulsar Digisight Ultra N230", // Цифровий приціл нічного бачення Pulsar Digisight Ultra N230
  "Pulsar Digisight Ultra N250", // Цифровий приціл нічного бачення Pulsar Digisight Ultra N250
  "Pulsar Digisight Ultra N355", // Цифровий приціл нічного бачення Pulsar Digisight Ultra N355
  "Pulsar Digisight Ultra N455 LRF", // Приціл нічного бачення Pulsar Digisight Ultra N455 LRF
  "Pulsar Forward F135", // Насадка нічного бачення Pulsar Forward F135
  "Pulsar Forward F155", // Насадка нічного бачення Pulsar Forward F155
  "Pulsar Forward F455", // Насадка нічного бачення Pulsar Forward F455
  "Pulsar Helion XP38", // Тепловізор Pulsar Helion XP38 (50 Гц) Литва
  "Pulsar Phantom 4x60 BW", // Приціл нічного бачення Pulsar Phantom 4x60 BW
  "Pulsar Thermion XG50", // Тепловізійний приціл Pulsar Thermion XG50
  "Pulsar Thermion XM30", // Тепловізійний приціл Pulsar Thermion XM30
  "Pulsar Thermion XM38", // Тепловізійний приціл Pulsar Thermion XM38
  "Pulsar Thermion XM50", // Тепловізійний приціл Pulsar Thermion XM50
  "Pulsar Thermion XP38", // Тепловізійний приціл Pulsar Thermion XP38
  "Pulsar Thermion XP50", // Тепловізійний приціл Pulsar Thermion XP50
  "Pulsar Thermion XQ38", // Тепловізійний приціл Pulsar Thermion XQ38
  "Pulsar Thermion XQ50", // Тепловізійний приціл Pulsar Thermion XQ50
  "Pulsar Trail 3 LRF XQ50", // Тепловізійний приціл Pulsar Trail 3 LRF XQ50
  "Pulsar Trail 3 LRF XR50", // Тепловізійний приціл Pulsar Trail 3 LRF XR50
  "Pulsar Trail LRF XP38", // Тепловізійний приціл Pulsar Trail LRF XP38
  "Pulsar Trail LRF XP50", // Тепловізійний приціл Pulsar Trail LRF XP50
  "Pulsar Trail LRF XQ38", // Тепловізійний приціл Pulsar Trail LRF XQ38
  "Pulsar Trail LRF XQ50", // Тепловізійний приціл Pulsar Trail LRF XQ50
  "Pulsar Trail XP38", // Тепловізійний приціл Pulsar Trail XP38
  "Pulsar Trail XP50", // Тепловізійний приціл Pulsar Trail XP50
  "Pulsar Trail XQ38", // Тепловізійний приціл Pulsar Trail XQ38
  "Pulsar Trail XQ50", // Тепловізійний приціл Pulsar Trail XQ50
  "RATT25-384-V3", // Тепловізійний приціл AGM RATTLER V3 25-384
  "RATT35-384-V3", // Тепловізійний приціл AGM RATTLER V3 LRF 35-384
  "RATT35-640-V3", // Тепловізійний приціл AGM RATTLER V3 LRF 35-640
  "RH50", // Тепловізійний приціл INFIRAY (IRAY) RICO RH50
  "RH50 V2", // Тепловізійний приціл INFIRAY (IRAY) RICO RH50 V2
  "RH50Pro", // Тепловізійний приціл INFIRAY (IRAY) RICO RH50Pro
  "RH50R", // Тепловізійний приціл INFIRAY (IRAY) RICO RH50R
  "RL42", // Тепловізійний приціл INFIRAY (IRAY) RICO RL42
  "RL42 V2", // Тепловізійний приціл INFIRAY (IRAY) RICO RL42 V2
  "RL42R", // Тепловізійний приціл INFIRAY (IRAY) RICO RL42R
  "RS75", // Тепловізійний приціл INFIRAY (IRAY) RICO RS75
  "Rattler-V3-50-640lrf", // Тепловізійний приціл AGM RATTLER V3 LRF 50-640
  "S75R", // Тепловізійний приціл Nocpix (Iray) Rico 2 S75R
  "SA-19", // Тепловізійний приціл PARD SA-19
  "SA-19 LRF", // Тепловізійний приціл PARD SA-19 LRF
  "SA-25", // Тепловізійний приціл PARD SA-25
  "SA-25 LRF", // Тепловізійний приціл PARD SA-25 LRF
  "SA-35", // Тепловізійний приціл PARD SA-35
  "SA-35 LRF", // Тепловізійний приціл PARD SA-35 LRF
  "SA-45", // Тепловізійний приціл PARD SA-45
  "SA-45 LRF", // Тепловізійний приціл PARD SA-45 LRF
  "SA32-19", // Тепловізійний приціл PARD SA32-19
  "SA32-19 LRF", // Тепловізійний приціл PARD SA32-19 LRF
  "SA32-25", // Тепловізійний приціл PARD SA32-25
  "SA32-25 LRF", // Тепловізійний приціл PARD SA32-25 LRF
  "SA32-35", // Тепловізійний приціл PARD SA32-35
  "SA32-35 LRF", // Тепловізійний приціл PARD SA32-35 LRF
  "SA32-45", // Тепловізійний приціл PARD SA32-45
  "SA32-45 LRF", // Тепловізійний приціл PARD SA32-45 LRF
  "SA62-25", // Тепловізійний приціл PARD SA62-25
  "SA62-25 LRF", // Тепловізійний приціл PARD SA62-25 LRF
  "SA62-35", // Тепловізійний приціл PARD SA62-35
  "SA62-35 LRF", // Тепловізійний приціл PARD SA62-35 LRF
  "SA62-45", // Тепловізійний приціл PARD SA62-45
  "SA62-45 LRF", // Тепловізійний приціл PARD SA62-45 LRF
  "SCT35R V2", // Тепловізійний приціл INFIRAY (IRAY) Saim SCT 35R V2
  "SECU35-384-LRF", // Тепловізійний приціл AGM Secutor LRF 35-384
  "SECU50-640-LRF", // Тепловізійний приціл AGM Secutor LRF 50-640
  "SECU75-640-LRF", // Тепловізійний приціл AGM Secutor LRF 75-640
  "SH35 3.0", // Тепловізійний приціл HikMicro STELLAR SH35 3.0
  "SH35L 3.0", // Тепловізійний приціл HikMicro STELLAR SH35L 3.0
  "SH50L 3.0", // Тепловізійний приціл HikMicro STELLAR SH50L 3.0
  "SQ35L 3.0", // Тепловізійний приціл HikMicro STELLAR SQ35L 3.0
  "SQ50L 3.0", // Тепловізійний приціл HikMicro STELLAR SQ50L 3.0
  "SU-19", // Тепловізійний приціл PARD SU-19
  "SU-19 LRF", // Тепловізійний приціл PARD SU-19 LRF
  "SU-25", // Тепловізійний приціл PARD SU-25
  "SU-25 LRF", // Тепловізійний приціл PARD SU-25 LRF
  "SU-35", // Тепловізійний приціл PARD SU-35
  "SU-35 LRF", // Тепловізійний приціл PARD SU-35 LRF
  "SU-45", // Тепловізійний приціл PARD SU-45
  "SU-45 LRF", // Тепловізійний приціл PARD SU-45 LRF
  "SX60L 3.0", // Тепловізійний приціл HikMicro STELLAR SX60L 3.0
  "SX60LS 3.0", // Тепловізійний приціл HikMicro STELLAR SX60LS 3.0
  "SaimSCT35", // Тепловізійний приціл INFIRAY (IRAY) Saim SCT 35
  "SaimSCT35 V2", // Тепловізійний приціл INFIRAY (IRAY) Saim SCT 35 V2
  "Sightmark Tactical", // Моноблок Sightmark Tactical 26/30 мм на Picatinny/Weaver з виносом 50 
  "Slim H35", // Тепловізійний приціл Nocpix (IRay) Slim H35
  "Slim L35", // Тепловізійний приціл Nocpix (IRay) Slim L35
  "Sytong HT-70 LRF", // Цифровий пріціл Sytong HT-70 LRF
  "TA425", // Тепловізійна насадка Guide TA425
  "TA450", // Тепловізійна насадка Guide TA450
  "TC35-384", // Тепловізонна насадка AGM RATTLER TC35-384
  "TD32-70 LRF", // Тепловізійний мультиспектральний приціл Pard TD32-70 LRF
  "TD62-70 LRF", // Тепловізійний мультиспектральний приціл Pard TD62-70 LRF
  "TFA1200", // Тепловізійний монокуляр Dipol TFA1200
  "TH35", // Тепловізійний приціл INFIRAY (IRAY) TUBE TH35
  "TH50", // Тепловізійний приціл INFIRAY (IRAY) TUBE TH50
  "TH50Z 2.0", // Тепловізійний приціл Hikmicro Thunder Zoom TH50Z 2.0
  "TL25SE", // Тепловізійний приціл INFIRAY (IRAY) TUBE TL25SE
  "TL35", // Тепловізійний приціл INFIRAY (IRAY) TUBE TL35
  "TL35SE", // Тепловізійний приціл INFIRAY (IRAY) TUBE TL35SE
  "TP25SE", // Тепловізійний приціл INFIRAY (IRAY) TUBE TP25SE
  "TQ60Z 2.0", // Тепловізійний приціл Hikmicro Thunder Zoom TQ60Z 2.0
  "TS19-256", // Тепловізійний приціл AGM RATTLER TS19-256
  "TS25-256", // Тепловізійний приціл AGM RATTLER TS25-256
  "TS25-384", // Тепловізійний приціл AGM RATTLER TS25-384
  "TS35-384", // Тепловізійний приціл AGM RATTLER TS35-384
  "TS35-640", // Тепловізійний приціл AGM Adder TS35-640
  "TS425", // Тепловізійний приціл Guide TS425
  "TS435", // Тепловізійний приціл Guide TS435
  "TS450", // Тепловізійний приціл Guide TS450
  "TS50-384", // Тепловізійний приціл AGM Adder TS50-384
  "TS50-640", // Тепловізійний приціл AGM Adder TS50-640
  "TU420", // Тепловізійний приціл Guide TU420
  "TU430", // Тепловізійний приціл Guide TU430
  "TU450", // Тепловізійний приціл Guide TU450
  "TU620", // Тепловізійний приціл Guide TU620
  "TU630", // Тепловізійний приціл Guide TU630
  "TU650", // Тепловізійний приціл Guide TU650
  "Talion XG35", // Тепловізійний приціл Pulsar Talion XG35
  "Talion XQ35 Pro", // Тепловізійний приціл Pulsar Talion XQ35 Pro
  "ThermTec Oryx-LR 635", // Тепловізійний приціл ThermTec Oryx-LR 635
  "ThermTec Oryx-LR 650", // Тепловізійний приціл ThermTec Oryx-LR 650
  "Thermion 2 LRF XG50", // Тепловізійний приціл Pulsar Thermion 2 LRF XG50
  "Thermion 2 LRF XG60", // Тепловізійний приціл Pulsar Thermion 2 LRF XG60
  "Thermion 2 LRF XL50", // Тепловізійний приціл Pulsar Thermion 2 LRF XL50
  "Thermion 2 LRF XL60", // Тепловізійний приціл Pulsar Thermion 2 LRF XL60
  "Thermion 2 LRF XP60", // Тепловізійний приціл Pulsar Thermion 2 LRF XP60
  "Thermion Duo DXP55", // Тепловізійний приціл Pulsar Thermion Duo DXP55
  "Thermion LRF 2 XQ50", // Тепловізійний приціл Pulsar Thermion 2 LRF XQ50 Pro
  "Tyke L325", // Тепловізійний приціл INFIRAY (IRAY) Tyke L325
  "Tyke L335", // Тепловізійний приціл INFIRAY (IRAY) Tyke L335
  "V2 25-320", // Тепловізійний приціл AGM RATTLER V2 25-320
  "V2 LRF 35-384", // Тепловізійний приціл AGM VARMINT V2 LRF 35-384
  "V2 LRF 35-640", // Тепловізійний приціл AGM VARMINT V2 LRF 35-640
  "V2 LRF 50-384", // Тепловізійний приціл AGM VARMINT V2 LRF 50-384
  "V2 LRF 50-640", // Тепловізійний приціл AGM Adder V2 LRF 50-640
  "Vagon 335 LRF", // Тепловізійний приціл Cono Tech Vagon 335 LRF
  "Vidar 335", // Тепловізійний приціл ThermEye Vidar 335
  "Vidar 335 2.0", // Тепловізійний приціл ThermTec Vidar 335 2.0
  "Vidar 335L", // Тепловізійний приціл ThermEye Vidar 335L
  "Vidar 335L 2.0", // Тепловізійний приціл ThermTec Vidar 335L 2.0
  "Vidar 350", // Тепловізійний приціл ThermEye Vidar 350
  "Vidar 350L", // Тепловізійний приціл ThermEye Vidar 350L
  "Vidar 360", // Тепловізійний приціл ThermEye Vidar 360
  "Vidar 360 2.0", // Тепловізійний приціл ThermTec Vidar 360 2.0
  "Vidar 360L", // Тепловізійний приціл ThermEye Vidar 360L
  "Vidar 360L 2.0", // Тепловізійний приціл ThermTec Vidar 360L 2.0
  "Vidar 635", // Тепловізійний приціл ThermEye Vidar 635
  "Vidar 635L", // Тепловізійний приціл ThermEye Vidar 635L
  "Vidar 650", // Тепловізійний приціл ThermEye Vidar 650
  "Vidar 650 2.0", // Тепловізійний приціл ThermTec Vidar 650 2.0
  "Vidar 650L", // Тепловізійний приціл ThermEye Vidar 650L
  "Vidar 650L 2.0", // Тепловізійний приціл ThermTec Vidar 650L 2.0
  "Vidar 660", // Тепловізійний приціл ThermEye Vidar 660
  "Vidar 660 2.0", // Тепловізійний приціл ThermTec Vidar 660 2.0
  "Vidar 660L", // Тепловізійний приціл ThermEye Vidar 660L
  "Vidar 660L 2.0", // Тепловізійний приціл ThermTec Vidar 660L 2.0
  "Vista H50", // Тепловізор Nocpix (IRay) Vista H50
  "Vista H50R", // Тепловізор Nocpix (IRay) Vista H50R
  "Vista S50R", // Тепловізор Nocpix (IRay) Vista S50R
  "WOLF-7 PRO NL1", // Прилад нічного бачення AGM WOLF-7 PRO NL1
  "WOLF-7 PRO NL1 HR", // Прилад нічного бачення AGM WOLF-7 PRO NL1 HR
  "Wolf-14 NL1 HR", // Прилад нічного бачення AGM Wolf-14 NL1 HR
  "Yukon-Rem", // Шийний ремінець Yukon/Pulsar для тепловізора
  "dipol-D753", // Приціл нічного бачення Dipol D753 3.1x 2+ покоління
  "dipol-D761", // Приціл нічного бачення Dipol D761 3.7x 2+ покоління
  "dipol-D761-6x", // Приціл нічного бачення Dipol D761 6x 2 + покоління
  "dipol-D777", // Приціл нічного бачення Dipol D777 3.1x 2+ покоління
  "dipol-d241h", // Приціл нічного бачення Dipol D241H 3.7x 2+ покоління
  "iray-weaver-scl", // Швидкоз ємний кронштейн IRAY на Weaver під XSIGHT SL/SH
  "nv008sp3-lrf-50", // Приціл нічного бачення Pard NV008SP3 LRF 50mm
  "nv008sp3-lrf-70", // Приціл нічного бачення Pard NV008SP3 LRF 70mm
  "nvec-hik-agm-f", // Швидкоз ємний кронштейн NVECTECH на Hikmicro/AGM
  "pard gm40s", // PARD ЖК-дисплей
  "pard-mt-3", // Кріплення Pard MT3
  "pard-night-stalker-4k-20-50", // Приціл нічного бачення Pard Night Stalker 4K 2.0 50mm
  "pard-night-stalker-4k-20-70", // Приціл нічного бачення Pard Night Stalker 4K 2.0 70mm
  "pard-night-stalker-4k-mini", // Приціл нічного бачення Pard Night Stalker 4K Mini
  "rhino", // AGM кріплення RHINO
  "Диполь D50TS1200", // Тепловізійний приціл Dipol D50TS1200
  "Диполь D50TS1200R", // Тепловізійний приціл Dipol D50TS1200R з далекоміром
  "Диполь D75TS1700", // Тепловізійний приціл Dipol D75TS1700
  "Диполь D75TS1700R", // Тепловізійний приціл Dipol D75TS1700R з далекоміром
  "ТFА1000", // Тепловізійний монокуляр Dipol TFA1000
]);
