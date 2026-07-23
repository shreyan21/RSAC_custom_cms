const typeHelp = {
  blocks: "Each block is one visible website section. Open a block to edit, reorder, hide, or remove it.",
  boolean: "Turn this setting on or off.",
  color: "Choose the colour used by this item.",
  json: "Edit the grouped rows and settings shown below.",
  list: "Enter one separate item on each line.",
  media: "Upload a local file or use an existing local media URL.",
  richtext: "Use the toolbar to format headings, paragraphs, lists, links, and emphasis.",
  select: "Choose one option from the list.",
  textarea: "Write the complete text shown in this part of the website.",
  text: "Enter the exact text that should appear on the website.",
};

const fieldSpecificHelp = {
  blocks: typeHelp.blocks,
  cardIcon: "Choose the icon displayed on this page's directory card.",
  contentSize: "Changes the size of paragraph and list text on this page.",
  contentSpacing: "Changes the vertical space between content items on this page.",
  contentWidth: "Changes how wide this page's main content area can be.",
  eyebrow: "Controls the small label shown immediately above the main page heading.",
  featuredImage: "Controls the main image shared by the English and Hindi versions.",
  headingSize: "Changes the size of the main heading on this page.",
  hiddenProfileNames: "Enter one exact visible profile name per line to hide a repeated imported card.",
  mediaSize: "Changes the displayed size of photos and other visual media on this page.",
  summary: "Controls the short introduction shown below the main page heading.",
  title: "Controls the main heading shown at the top of this page.",
};

export const fieldHelpText = (field) => {
  if (!field) return "";
  const help = field.help || field.helpText || fieldSpecificHelp[field.name] || typeHelp[field.type];
  if (!help) return "";
  return field.localized === false
    ? `${help} This value is shared by English and Hindi.`
    : help;
};
