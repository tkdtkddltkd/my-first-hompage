function getPlainText(propertyValue) {
  if (!propertyValue) return "";

  if (propertyValue.type === "title") {
    return (propertyValue.title || []).map((item) => item.plain_text).join("");
  }

  if (propertyValue.type === "rich_text") {
    return (propertyValue.rich_text || []).map((item) => item.plain_text).join("");
  }

  if (propertyValue.type === "number") {
    return String(propertyValue.number ?? "");
  }

  if (propertyValue.type === "url") {
    return String(propertyValue.url ?? "");
  }

  if (propertyValue.type === "date" && propertyValue.date) {
    return String(propertyValue.date.start ?? "");
  }

  if (propertyValue.type === "select" && propertyValue.select) {
    return String(propertyValue.select.name ?? "");
  }

  return "";
}

function getPropertyValue(properties, names) {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(properties, name)) {
      return properties[name];
    }
  }

  return null;
}

function getPropertyText(properties, names) {
  return getPlainText(getPropertyValue(properties, names));
}

function getPropertyFileUrl(properties, names) {
  const property = getPropertyValue(properties, names);
  if (!property) return "";

  if (property.type === "files") {
    for (const file of property.files || []) {
      if (file.type === "file" && file.file?.url) return file.file.url;
      if (file.type === "external" && file.external?.url) return file.external.url;
    }
  }

  if (property.type === "url") {
    return property.url || "";
  }

  return "";
}

function toSlug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function newParagraphBlockFromText(text) {
  if (!text) return [];

  return [
    {
      type: "paragraph",
      richText: [
        {
          text,
          href: null,
          annotations: {
            bold: false,
            italic: false,
            code: false,
            color: "default",
          },
        },
      ],
    },
  ];
}

function convertRichText(items) {
  return (items || []).map((item) => ({
    text: String(item.plain_text || ""),
    href: item.href || null,
    annotations: {
      bold: Boolean(item.annotations?.bold),
      italic: Boolean(item.annotations?.italic),
      code: Boolean(item.annotations?.code),
      color: String(item.annotations?.color || "default"),
    },
  }));
}

function convertBlock(block) {
  const type = String(block.type || "");
  const payload = block[type];
  if (!payload) return null;

  return {
    type,
    richText: convertRichText(payload.rich_text),
  };
}

async function notionFetch(path, options = {}) {
  const response = await fetch(`https://api.notion.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Notion API ${response.status}: ${text}`);
  }

  return response.json();
}

async function getPageBlocks(pageId) {
  const response = await notionFetch(`/blocks/${pageId}/children?page_size=100`);
  return (response.results || [])
    .filter((block) =>
      ["paragraph", "bulleted_list_item", "numbered_list_item"].includes(block.type)
    )
    .map(convertBlock)
    .filter(Boolean);
}

async function getPageData() {
  if (!process.env.NOTION_TOKEN || !process.env.NOTION_DATABASE_ID) {
    throw new Error("NOTION_TOKEN or NOTION_DATABASE_ID is missing.");
  }

  const queryResult = await notionFetch(
    `/databases/${process.env.NOTION_DATABASE_ID}/query`,
    {
      method: "POST",
      body: JSON.stringify({ page_size: 100 }),
    }
  );

  const columns = [[], [], []];
  let itemIndex = 0;

  for (const page of queryResult.results || []) {
    const props = page.properties || {};
    const titleText = getPropertyText(props, ["Title", "title", "제목", "제목(title)"]);
    const summaryText = getPropertyText(props, ["Body", "body", "본문", "본문(body)"]);
    const dateText = getPropertyText(props, [
      "Date",
      "date",
      "작성날짜",
      "글작성날짜",
      "글작성날짜(date)",
    ]);
    const imageUrl = getPropertyFileUrl(props, [
      "Image",
      "image",
      "ImageUrl",
      "이미지",
      "첨부 이미지",
    ]);

    const fetchedBlocks = await getPageBlocks(page.id);
    const pageBody = fetchedBlocks.length
      ? fetchedBlocks
      : newParagraphBlockFromText(summaryText);

    const columnIndex = itemIndex % 3;

    columns[columnIndex].push({
      type: "box",
      id: String(page.id),
      slug: toSlug(titleText) || String(page.id),
      title: titleText,
      summary: summaryText,
      date: dateText,
      imageUrl,
      body: pageBody,
    });

    itemIndex += 1;
  }

  return {
    source: "notion",
    columns,
  };
}

export default async function handler(req, res) {
  try {
    const data = await getPageData();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      source: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
