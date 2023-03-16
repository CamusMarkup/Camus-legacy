// headers.
/// 1.  level 1 ~ 6 headers.
/// 2.  advanced title block with top & main
/// 3.  advanced title block with subtitle & main
/// 4.  advanced title block with top, subtitle & main.
/// 5.  advanced title block (generic syntax) with top & main.
/// 6.  advanced title block (generic syntax) with subtitle & main.
/// 7.  advanced title block (generic syntax) with top, subtitle & main.

// horizontal rulers.
/// 1.  5 dashes should be hr.
/// 2.  more than 5 dashes should be hr.
/// 3.  indented dashes (no less than 5) should be hr.
/// 4.  less than 5 dashes should not be hr.
/// 5.  lines consisting of other characters should not be hr.

// atomic nodes.
/// links.
//// 1.  links with no alt.
//// 2.  links with alt.
/// refs.
//// 1.  normal ref (no namespace).
//// 2.  normal ref with alt (no namespace).
//// 3.  wiki ref.
//// 4.  wiki ref with alt.
//// 5.  namespace ref.
//// 6.  namespace ref with alt.
/// images.
//// 1.  image with no alt.
//// 2.  image with alt.
/// footnote ref.
//// 1.  footnote ref with single id
//// 2.  footnote ref with multiple id
//// 3.  footnote ref id separated by comma, empty ids are ignored
/// global state flags.
//// 1.  global state flags

// inline style.
/// 1.  lines with only a single inline style node.
/// 2.  lines with texts surrounding a single inline style node.
/// 3.  lines with multiple inline style, correct order.
/// 4.  lines with multiple inline style, incorrect order.
/// 5.  single character superscript.
/// 6.  single character subscript.
/// 7.  multiple character superscript
/// 8.  multiple character subscript.
/// 9.  nesting superscript.
/// 10. nesting subscript.
/// 11. escaping

// lists.
/// unordered lists.
//// 1.  + starts an unordered list.
//// 2.  unordered lists nest with respect to the indent.
//// 3.  unordered list items span multiple lines with respect to the indent.
/// ordered lists.
//// 1.  "number+period" starts an ordered list.
//// 2.  ordered lists nest with respect to the indent.
//// 3.  ordered list items span multiple lines with respect to the indent.
//// 4.  mixing up numbers gives the same result.
/// 1.  mixing ordered & unordered lists.


// quote blocks.
/// 1.  > starts a quote block.
/// 2.  quote blocks that starts with > supports nesting.
/// 3.  quote block with generic syntax.

// table.
/// 1.  table with divider.
/// 2.  if no divider exists, tables only consist of table body only.

// code blocks.
/// 1.  code block with no args.
/// 2.  code block with args.

// metadata.
/// 1.  metadata block.
/// 2.  lines with no key-value separator are ignored.

// raw output block.
/// 1.  raw output block syntax produces raw output block node.

// generic blocks.
/// 1.  blocks shall be nesting by indent.
