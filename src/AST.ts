type Position = {
    line: number,
    col: number,
};

type Range = {
    start?: Position,
    end?: Position,
};

export enum CamusNodeType {
    Heading = 1,
    Block,
    InlineStyle,
    InlineCode,
    InlineIgnore,
    Link,
    Ref,
    FootnoteRef,
    FootnoteText,
    FootnoteBlock,
    Image,
    List,
    ListItem,
    HorizontalRule,
}

export type HeadingNode = {
    _nodeType: CamusNodeType.Heading,
    level: number,
    text: CamusLine
};

// NOTE: type='verbatim' and type='code' will have CamusLine that only contains strings.
export type BlockNode = {
    _nodeType: CamusNodeType.Block,
    type: string,
    arg: string,
    text: CamusLogicLine[],
};

export type InlineStyleNode = {
    _nodeType: CamusNodeType.InlineStyle,
    style: ('bold'|'italics'|'underline'|'delete')[],
    text: CamusLine,
}

export type InlineCodeNode = {
    _nodeType: CamusNodeType.InlineCode,
    text: string,
};

export type InlineIgnoreNode = {
    _nodeType: CamusNodeType.InlineIgnore,
    text: string,
}

export type LinkNode = {
    _nodeType: CamusNodeType.Link,
    url: string,
    text: string,
};

export type RefNode = {
    _nodeType: CamusNodeType.Ref,
    path: string,
};

export type FootnoteRefNode = {
    _nodeType: CamusNodeType.FootnoteRef,
    id: string,
};
export type FootnoteTextNode = {
    _nodeType: CamusNodeType.FootnoteText,
    id: string,
    text: CamusLogicLine[],
};
export type FootnoteBlockNode = {
    _nodeType: CamusNodeType.FootnoteBlock,
    content: FootnoteTextNode[],
}
export type ImageNode = {
    _nodeType: CamusNodeType.Image,
    url: string,
    alt: string,
};

export type ListNode = {
    _nodeType: CamusNodeType.List,
    ordered: boolean,
    items: ListItemNode[]
};

export type ListItemNode = {
    _nodeType: CamusNodeType.ListItem,
    text: CamusLogicLine[],
}

export type HorizontalRuleNode = {
    _nodeType: CamusNodeType.HorizontalRule,
}

// NOTE: atomic node means an inline node that cannot contain a child node.
export type CamusAtomicNode = string | LinkNode | RefNode | FootnoteRefNode | InlineCodeNode | InlineIgnoreNode | ImageNode ;
export function isCamusAtomicNode(x: CamusNode): x is CamusAtomicNode {
    return typeof x === 'string' || [
        CamusNodeType.Link,
        CamusNodeType.Ref,
        CamusNodeType.FootnoteRef,
        CamusNodeType.InlineCode,
        CamusNodeType.InlineIgnore,
        CamusNodeType.Image,
    ].includes(x._nodeType);
}
export type CamusInlineNode = InlineStyleNode | CamusAtomicNode;
export function isCamusInlineNode(x: CamusNode): x is CamusInlineNode {
    return isCamusAtomicNode(x) || [
        CamusNodeType.InlineStyle
    ].includes(x._nodeType);
}
// NOTE: `CamusLine` represents a single line of text (not logic line)
export type CamusLine = CamusInlineNode[]
export type CamusLineNode = FootnoteTextNode | HeadingNode | HorizontalRuleNode;
export function isCamusLineNode(x: CamusNode): x is CamusLineNode {
    return typeof x !== 'string' && [
        CamusNodeType.FootnoteText,
        CamusNodeType.Heading,
        CamusNodeType.HorizontalRule,
    ].includes(x._nodeType);
}
export type CamusLogicLine = CamusNode[]
export type CamusBlockNode = BlockNode | ListNode | FootnoteBlockNode;
export function isCamusBlockNode(x: CamusNode): x is CamusBlockNode {
    return typeof x !== 'string' && [
        CamusNodeType.Block,
        CamusNodeType.List,
        CamusNodeType.FootnoteBlock,
    ].includes(x._nodeType);
}
export type CamusNode = CamusInlineNode | CamusLineNode | CamusBlockNode;
