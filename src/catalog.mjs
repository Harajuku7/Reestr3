export const people = [
  {
    id: "shor",
    name: "Шорцы",
    eyebrow: "Коренной малочисленный народ",
    image: "/assets/shor-culture.webp",
    alt: "Участники культурной программы в традиционных костюмах у деревянного дома",
    area: "Юг Кузбасса, Горная Шория, бассейны рек Кондомы и Мрас-Су",
    summary:
      "Традиционная культура шорцев связана с горно-таежным ландшафтом, охотой, рыболовством, собирательством, ремеслами, устным наследием и календарными обрядами.",
    source: "https://www.culture.ru/events/6780025/programma-tradicii-i-obryady-shorskogo-naroda"
  },
  {
    id: "teleut",
    name: "Телеуты",
    eyebrow: "Коренной малочисленный народ",
    image: "/assets/teleut-festival.jpg",
    alt: "Участница телеутского национального праздника в традиционном головном уборе",
    area: "Беловский и Гурьевский округа, бассейны Большого и Малого Бачата",
    summary:
      "Телеутское наследие сохраняется в семейных и календарных обычаях, песенной культуре, национальной одежде, ткачестве, кухне и локальных праздничных традициях.",
    source: "https://visit-kuzbass.ru/events/regionalnyij-teleutskij-naczionalnyij-prazdnik-edinstva-tele-kaan"
  },
  {
    id: "russian",
    name: "Русские",
    eyebrow: "Историко-культурные традиции региона",
    image: "/assets/russian-culture.webp",
    alt: "Здание центра русского фольклора и этнографии в Новокузнецке",
    area: "Города и сельские территории Кузбасса",
    summary:
      "Русская традиционная культура Кузбасса включает празднично-обрядовые практики, фольклор, народные игры, ремесла, семейный быт и локальные сибирские формы гостеприимства.",
    source: "https://www.culture.ru/institutes/103017"
  }
]

export const categories = [
  { id: "rituals", label: "Обряды", index: "01", description: "Семейные, календарные и переходные практики" },
  { id: "holidays", label: "Праздники", index: "02", description: "События народного календаря и общинной жизни" },
  { id: "crafts", label: "Ремесла", index: "03", description: "Ткачество, обработка материалов и ручные технологии" },
  { id: "economy", label: "Хозяйственные занятия", index: "04", description: "Традиционные способы труда и взаимодействия с природой" },
  { id: "oral", label: "Устные традиции", index: "05", description: "Сказания, песни, предания и формы передачи знаний" },
  { id: "performance", label: "Исполнительские искусства", index: "06", description: "Музыка, танец и формы коллективного исполнения" }
]

export const catalogItems = [
  { id: 1, title: "Весенний календарный обряд", people: "shor", category: "rituals", status: "transformed", place: "Горная Шория" },
  { id: 2, title: "Ткачество традиционного пояса", people: "teleut", category: "crafts", status: "preserved", place: "Беловский округ" },
  { id: 3, title: "Кузнецкие вечерки", people: "russian", category: "holidays", status: "transformed", place: "Новокузнецк" },
  { id: 4, title: "Заготовка и обработка кедрового ореха", people: "shor", category: "economy", status: "partial", place: "Таштагольский округ" },
  { id: 5, title: "Праздничная песенная традиция", people: "teleut", category: "performance", status: "partial", place: "Гурьевский округ" },
  { id: 6, title: "Сибирское чаепитие", people: "russian", category: "rituals", status: "preserved", place: "Кемеровская область" },
  { id: 7, title: "Героические сказания", people: "shor", category: "oral", status: "partial", place: "Мысковский округ" },
  { id: 8, title: "Традиционные народные игры", people: "russian", category: "performance", status: "transformed", place: "Кузбасс" }
]

export const statuses = {
  preserved: "Сохраняется",
  partial: "Частично сохраняется",
  transformed: "Трансформировалось",
  lost: "Утрачено"
}

export function filterCatalog(items, filters) {
  const query = filters.query.trim().toLocaleLowerCase("ru")
  return items.filter((item) => {
    const matchesPeople = filters.people === "all" || item.people === filters.people
    const matchesCategory = filters.category === "all" || item.category === filters.category
    const matchesStatus = filters.status === "all" || item.status === filters.status
    const haystack = `${item.title} ${item.place}`.toLocaleLowerCase("ru")
    return matchesPeople && matchesCategory && matchesStatus && (!query || haystack.includes(query))
  })
}
