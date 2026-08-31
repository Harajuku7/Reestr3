export const people = [
  {
    id: "shor",
    name: "Шорцы",
    eyebrow: "Коренной малочисленный народ",
    image: "assets/shor-culture.webp",
    alt: "Участники культурной программы в традиционных костюмах у деревянного дома",
    area: "Юг Кузбасса, Горная Шория, бассейны рек Кондомы и Мрас-Су",
    summary:
      "Коренной малочисленный тюркоязычный народ Кузбасса, проживающий в горно-таежной местности. Основными хозяйственными занятиями шорцев традиционно являлись охота и собирательство, с приходом русских получило распространение ручное мотыжное земледелие. Духовная культура характеризуется религиозным синкретизмом, органично объединяющим родовые культы, восходящие к анимизму, шаманизм и христианство.",
    source: "https://www.culture.ru/events/6780025/programma-tradicii-i-obryady-shorskogo-naroda"
  },
  {
    id: "teleut",
    name: "Телеуты",
    eyebrow: "Коренной малочисленный народ",
    image: "assets/teleut-festival.jpg",
    alt: "Участница телеутского национального праздника в традиционном головном уборе",
    area: "Беловский и Гурьевский округа, бассейны Большого и Малого Бачата",
    summary:
      "Коренной малочисленный тюркоязычный народ Кузбасса. Телеуты традиционно являлись скотоводами, перешедшими на оседлый образ жизни. Бачатские телеуты славятся своими ремеслами, многие из которых бытуют по сей день. Из традиционных верований сохраняются пережитки родовых культов, ранее широкое распространение имел шаманизм.",
    source: "https://visit-kuzbass.ru/events/regionalnyij-teleutskij-naczionalnyij-prazdnik-edinstva-tele-kaan"
  }
]

export const categories = [
  {
    id: "everyday",
    label: "Культура быта",
    index: "01",
    items: [
      "Процессы, связанные с обустройством быта",
      "Технология приготовления пищи",
      "Способ ношения традиционного костюма"
    ]
  },
  {
    id: "production",
    label: "Культура производства",
    index: "02",
    items: [
      "Строительные технологии",
      "Технологии изготовления костюма",
      "Традиционные ремесла",
      "Хозяйственные занятия: охота, собирательство, земледелие и т. д."
    ]
  },
  {
    id: "mythology",
    label: "Мифологические представления",
    index: "03",
    items: ["Анимизм", "Космологические представления", "Суеверия"]
  },
  {
    id: "oral-performance",
    label: "Устное народное творчество и исполнительские искусства",
    index: "04",
    items: ["Фольклорные формы", "Танцы", "Песни", "Народный театр", "Народная музыка"]
  },
  {
    id: "rituals",
    label: "Традиционная обрядность",
    index: "05",
    items: ["Сезонные обряды", "Обряды жизненного цикла", "Окказиональные обряды"]
  },
  {
    id: "games",
    label: "Традиционные игры",
    index: "06",
    items: ["Ролевые", "Подвижные", "Состязания"]
  }
]

export const catalogItems = [
  { id: 1, title: "Весенний календарный обряд", people: "shor", category: "rituals", status: "transformed", place: "Горная Шория" },
  { id: 2, title: "Ткачество традиционного пояса", people: "teleut", category: "production", status: "preserved", place: "Беловский округ" },
  { id: 4, title: "Заготовка и обработка кедрового ореха", people: "shor", category: "production", status: "partial", place: "Таштагольский округ" },
  { id: 5, title: "Праздничная песенная традиция", people: "teleut", category: "oral-performance", status: "partial", place: "Гурьевский округ" },
  { id: 7, title: "Героические сказания", people: "shor", category: "oral-performance", status: "partial", place: "Мысковский округ" }
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
