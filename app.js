const grid = document.querySelector("#page-grid");
const boxedTemplate = document.querySelector("#boxed-template");
const mediaTemplate = document.querySelector("#media-template");

const fallbackData = {
  source: "demo",
  columns: [
    [
      {
        type: "box",
        id: "first-post",
        slug: "first-post",
        title: "첫 번째 글 샘플",
        summary: "노션에서 제목, 본문, 날짜, 첨부 이미지를 작성하면 이 카드에 표시됩니다.",
        date: "2026-03-22",
        imageUrl: "./assets/first-card-image.png",
        body: [
          {
            type: "paragraph",
            richText: [{ text: "이 페이지는 상세 페이지 예시입니다." }]
          },
          {
            type: "paragraph",
            richText: [{ text: "노션 본문이 길면 이곳에 그대로 이어서 표시됩니다." }]
          }
        ]
      },
      {
        type: "box",
        id: "second-post",
        slug: "second-post",
        title: "두 번째 글 샘플",
        summary: "카드를 클릭하면 새 글 페이지가 열립니다.",
        date: "2026-03-20",
        imageUrl: buildPlaceholder("portrait"),
        body: [
          {
            type: "paragraph",
            richText: [{ text: "하늘색 배경과 흰색 박스, 검은 그림자 톤은 그대로 유지됩니다." }]
          }
        ]
      }
    ],
    [
      {
        type: "box",
        id: "third-post",
        slug: "third-post",
        title: "세 번째 글 샘플",
        summary: "본문 요약은 홈페이지 카드에 먼저 보이고, 상세 페이지에서는 전체 내용이 보입니다.",
        date: "2026-03-18",
        imageUrl: buildPlaceholder("square"),
        body: [
          {
            type: "paragraph",
            richText: [{ text: "노션 데이터베이스의 본문 칸과 내부 페이지 본문을 함께 활용할 수 있습니다." }]
          }
        ]
      }
    ],
    [
      {
        type: "box",
        id: "fourth-post",
        slug: "fourth-post",
        title: "네 번째 글 샘플",
        summary: "첨부 이미지는 홈페이지 카드와 상세 페이지 둘 다에 보이게 연결됩니다.",
        date: "2026-03-15",
        imageUrl: buildPlaceholder("landscape"),
        body: [
          {
            type: "paragraph",
            richText: [{ text: "이제 노션을 블로그 글 관리 화면처럼 사용할 수 있습니다." }]
          }
        ]
      }
    ]
  ]
};

init();

async function init() {
  const data = await loadContent();
  renderPage(data);
  bindCardNavigation();
  renderStatus(data.source);
}

async function loadContent() {
  try {
    const response = await fetch("./api/content", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`API ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn("Notion API data unavailable. Using demo content.", error);
    return fallbackData;
  }
}

function renderPage(data) {
  grid.innerHTML = "";

  data.columns.forEach((items, index) => {
    const column = document.createElement("section");
    column.className = "page-column";
    column.dataset.column = String(index + 1);

    items.forEach((item) => {
      column.appendChild(renderItem(item));
    });

    grid.appendChild(column);
  });
}

function renderItem(item) {
  if (item.type === "box") {
    const fragment = boxedTemplate.content.cloneNode(true);
    const root = fragment.querySelector(".box-card");
    const title = fragment.querySelector(".box-card__title");
    const body = fragment.querySelector(".box-card__body");

    if (item.imageUrl) {
      body.appendChild(renderCardImage(item.imageUrl, item.title));
    }

    if (item.date) {
      body.appendChild(renderMeta(item.date));
    }

    title.innerHTML = item.title ? escapeHtml(item.title) : "";

    if (item.summary) {
      const summary = document.createElement("p");
      summary.innerHTML = escapeHtml(item.summary).replace(/\n/g, "<br />");
      body.appendChild(summary);
    } else {
      (item.body || []).slice(0, 1).forEach((block) => body.appendChild(renderBlock(block)));
    }

    if (item.slug || item.id) {
      root.classList.add("box-card--clickable");
      root.dataset.detailHref = `./detail.html?slug=${encodeURIComponent(item.slug || item.id)}`;
      root.tabIndex = 0;
      root.setAttribute("role", "link");
      root.setAttribute("aria-label", `${item.title || "Detail"} detail page`);
    }

    return root;
  }

  if (item.type === "media") {
    return renderMedia(item);
  }

  if (item.type === "media-pair") {
    const wrapper = document.createElement("section");
    wrapper.className = "media-pair";
    item.items.forEach((mediaItem) => wrapper.appendChild(renderMedia(mediaItem)));
    return wrapper;
  }

  return document.createElement("div");
}

function bindCardNavigation() {
  grid.addEventListener("click", (event) => {
    const card = event.target.closest(".box-card--clickable");
    if (!card || event.target.closest("a")) {
      return;
    }

    window.location.href = card.dataset.detailHref;
  });

  grid.addEventListener("keydown", (event) => {
    const card = event.target.closest(".box-card--clickable");
    if (!card) {
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    window.location.href = card.dataset.detailHref;
  });
}

function renderMedia(item) {
  const fragment = mediaTemplate.content.cloneNode(true);
  const root = fragment.querySelector(".media-card");
  const image = fragment.querySelector(".media-card__image");
  const variant = item.variant || "landscape";

  root.classList.add(`media-card--${variant}`);
  image.src = item.imageUrl || buildPlaceholder(variant);
  image.alt = item.alt || "";

  return root;
}

function renderCardImage(src, alt) {
  const figure = document.createElement("figure");
  figure.className = "box-card__figure";

  const image = document.createElement("img");
  image.className = "box-card__image";
  image.src = src;
  image.alt = alt || "";

  figure.appendChild(image);
  return figure;
}

function renderMeta(dateText) {
  const meta = document.createElement("p");
  meta.className = "box-card__meta";
  meta.textContent = formatDate(dateText);
  return meta;
}

function renderBlock(block) {
  if (block.type === "bulleted_list_item") {
    const ul = document.createElement("ul");
    const li = document.createElement("li");
    li.innerHTML = renderRichText(block.richText || []);
    ul.appendChild(li);
    return ul;
  }

  if (block.type === "numbered_list_item") {
    const ol = document.createElement("ol");
    const li = document.createElement("li");
    li.innerHTML = renderRichText(block.richText || []);
    ol.appendChild(li);
    return ol;
  }

  const paragraph = document.createElement("p");
  paragraph.innerHTML = renderRichText(block.richText || []);
  return paragraph;
}

function renderRichText(items) {
  return items
    .map((item) => {
      const text = escapeHtml(item.text || "");
      const content = applyAnnotations(text, item.annotations || {});

      if (item.href) {
        return `<a href="${escapeAttribute(item.href)}" target="_blank" rel="noreferrer">${content}</a>`;
      }

      return content;
    })
    .join("");
}

function applyAnnotations(text, annotations) {
  let html = text.replace(/\n/g, "<br />");

  if (annotations.bold) {
    html = `<strong>${html}</strong>`;
  }

  if (annotations.italic) {
    html = `<em>${html}</em>`;
  }

  if (annotations.code) {
    html = `<code>${html}</code>`;
  }

  if (annotations.color === "yellow_background") {
    html = `<mark>${html}</mark>`;
  }

  if (annotations.color === "green_background") {
    html = `<mark data-color="green">${html}</mark>`;
  }

  return html;
}

function renderStatus(source) {
  const message =
    source === "notion"
      ? "노션의 제목, 본문, 날짜, 첨부 이미지가 카드와 상세 페이지에 표시되고 있습니다."
      : "현재는 데모 문구가 보입니다. notion.config.json을 채우면 노션 글이 표시됩니다.";

  const banner = document.createElement("aside");
  banner.className = "status-banner";
  banner.textContent = message;
  document.body.appendChild(banner);
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

function buildPlaceholder(variant) {
  const sizes = {
    portrait: { width: 900, height: 1200 },
    square: { width: 1200, height: 1200 },
    landscape: { width: 1400, height: 933 }
  };

  const size = sizes[variant] || sizes.landscape;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}">
      <rect width="100%" height="100%" fill="#d9d9d9"/>
      <rect x="${size.width * 0.08}" y="${size.height * 0.08}" width="${size.width * 0.84}" height="${size.height * 0.84}" fill="#efefef" stroke="#777" stroke-width="10"/>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return String(value).replaceAll('"', "&quot;");
}
