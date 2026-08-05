export const toggleEditorQuote = (editor) => {
  if (!editor) return false;

  if (editor.isActive("blockquote")) {
    return editor.chain().focus().lift("blockquote").run();
  }

  if (editor.isActive("listItem")) {
    return editor.chain()
      .focus()
      .liftListItem("listItem")
      .toggleBlockquote()
      .run();
  }

  return editor.chain().focus().toggleBlockquote().run();
};
