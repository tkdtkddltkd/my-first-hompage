const detailTitle = document.querySelector("#detail-title");
const detailBody = document.querySelector("#detail-body");

const fallbackData = {
  source: "demo",
  columns: [
    [
      {
        type: "box",
        id: "first-post",
        slug: "first-post",
        title: "첫 번째 글 샘플",
        date: "2026-03-22",
        imageUrl: buildPlaceholder("landscape"),
        body: [
          {
            type: "paragraph",
            richText: [{ text: "이 페이지는 상세 페이지 예시입니다." }]
          },
          {
            type: "paragraph",
            richText: [{ text: "노션에서 쓴 긴 본문이 이곳에 그대로 표시됩니다." }]
          }
        ]
      }
    ]
  ]
};

init();

async function init() {
  const slug = new URLSearchParams(window.location.search).get("slug");
  const data = await loadContent();
  const boxes = flattenBoxes(data.columns);
  const item = boxes.find((entry) => entry.slug === slug || entry.id === slug) || boxes[0];

  if (!item) {
    renderMissing();
    return;
  }

  document.title = item.title || "Detail Page";
  detailTitle.textContent = item.title || "Untitled";
  detailBody.innerHTML = "";
  renderHeader(item);
  (item.body || []).forEach((block) => detailBody.appendChild(renderBlock(block)));
}

async function loadContent() {
  try {
    const response = await fetch("./api/content", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`API ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn("Notion API data unavailable. Using demo detail content.", error);
    return fallbackData;
  }
}

function flattenBoxes(columns) {
  return columns.flat().filter((item) => item.type === "box");
}

function renderHeader(item) {
  const header = detailTitle.parentElement;
  header.querySelectorAll(".detail-card__meta, .detail-card__figure").forEach((node) => node.remove());

  if (item.date) {
    const meta = document.createElement("p");
    meta.className = "detail-card__meta";
    meta.textContent = formatDate(item.date);
    header.appendChild(meta);
  }

  if (item.imageUrl) {
    const figure = document.createElement("figure");
    figure.className = "detail-card__figure";
    const image = document.createElement("img");
    image.className = "detail-card__image";
    image.src = item.imageUrl;
    image.alt = item.title || "";
    figure.appendChild(image);
    header.appendChild(figure);
  }
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

function renderMissing() {
  detailTitle.textContent = "Page not found";
  detailBody.innerHTML = "<p>The selected card could not be found.</p>";
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
