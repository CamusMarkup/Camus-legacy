import { ASSERT } from './Assert';
import * as ast from './AST';

const REGEX_BRACE_TAG = /^\{([a-zA-Z0-9]+)(?:\(((?:\\\)|[^)])*)\))?:((?:\\\}|[^}])*)\}/;
const REGEX_FOOTNOTE_TAG = /^\{footnote@((?:\\\}|\\\]|[^}\]\s])*)\}/;
const REGEX_HASH_TAG = /^\{#((?:\\\}|[^}])*)\}/;

const REGEX_SUPSUB_TEXT = /^\{((?:\\\}|[^}])*?)\}/;


function _checkIfSpecialTreatmentRequiredInline(x: string): boolean {
    return !!(
        REGEX_BRACE_TAG.exec(x)
        || REGEX_FOOTNOTE_TAG.exec(x)
        || REGEX_HASH_TAG.exec(x)
    );
}

/*


normal *bold _boldu ~~budelete~~ boldu __ bold*

--> normal              ==> stash=['normal '], stack=[]
    *                   ==> stash=['normal ',[]], stack=[*]
    bold                ==> stash=['normal ',['bold']], stack=[*]
    _                   ==> stash=['normal ',['bold'],[]], stack=[*_]
    boldu               ==> stash=['normal ',['bold'],['boldu ']], stack=[*_]
    ~~                  ==> stash=['normal ',['bold'],['boldu '],[]], stack=[*_~~]
    budelete            ==> stash=['normal ',['bold'],['boldu '],['budelete']], stack=[*_~~]
    ~~                  ==> stash=['normal ',['bold'],['boldu ',Node(~~,['budelete'])]], stack=[*_]
     boldu              ==> stash=['normal ',['bold'],['boldu ',Node(~~,['budelete']),' boldu ']], stack=[*_]
    __                  ==> stash=['normal ',['bold',Node(__,['boldu ',Node(~~,['budelete']),' boldu '])]], stack=[*]
     bold               ==> stash=['normal ',['bold',Node(__,['boldu ',Node(~~,['budelete']),' boldu ']),'bold']], stack=[*]
    *                   ==> stash=['normal ',Node(*,['bold',Node(__,['boldu ',Node(~~,['budelete']),' boldu ']),'bold'])], stack=[]

    stash = [], stack = []
    if x[0] is style char:
        if x[0] not in stack:
            push new array in stash.
            push x[0] in stack.
        else:
            z = pop stash top array.
            new node: stacktop, z.
            put new node in current stash.
    else:
        take until style char.
        push in stash. 
        continue.
*/
// NOTE: requires x to have only one single line.
function _parseInline(x: string): ast.CamusLine {
    let matchres;
    let subj = x;
    let stash: (ast.CamusInlineNode|ast.CamusLine)[] = [];
    let stack: string[] = [];
    let _StashPush = (x: string|ast.CamusInlineNode) => {
        let stashTop = stash[stash.length-1];
        if (Array.isArray(stashTop)) {
            stashTop.push(x);
        } else {
            stash.push(x);
        }
    };
    while (subj) {
        if (matchres = REGEX_FOOTNOTE_TAG.exec(subj)) {
            _StashPush({_nodeType: ast.CamusNodeType.FootnoteRef, idList: matchres[1].split(',').map((v) => v.trim())});
            subj = subj.substring(matchres[0].length);
        } else if (matchres = REGEX_HASH_TAG.exec(subj)) {
            _StashPush({_nodeType: ast.CamusNodeType.Tag, id: matchres[1]});
            subj = subj.substring(matchres[0].length);
        } else if (matchres = REGEX_BRACE_TAG.exec(subj)) {
            switch (matchres[1]) {
                case 'link': {
                    _StashPush({_nodeType: ast.CamusNodeType.Link, url: matchres[3]||'', text: _parseInline(matchres[2]||'')});
                    break;
                }
                case 'img': {
                    _StashPush({_nodeType: ast.CamusNodeType.Image, url: matchres[3]||'', alt: (matchres[2]||'').replace(/\\(.)/g, '$1')});
                    break;
                }
                case 'ref': {
                    _StashPush({_nodeType: ast.CamusNodeType.Ref, path: matchres[3]||'', text: _parseInline(matchres[2]||'')});
                    break;
                }
                case 'wiki': {
                    _StashPush({_nodeType: ast.CamusNodeType.WikiTag, name: matchres[3]||'', text: _parseInline(matchres[2]||'')});
                    break;
                }
                default: {
                    _StashPush(matchres[0]);
                    break;
                }
            }
            subj = subj.substring(matchres[0].length);
        } else if (subj[0] === '^') {    // superscript
            subj = subj.substring(1);
            if (!subj[0]) { _StashPush('^'); }
            else {
                matchres = REGEX_SUPSUB_TEXT.exec(subj);
                if (!matchres) {
                    _StashPush({_nodeType: ast.CamusNodeType.InlineStyle, style: ['super'], text: [subj[0]]})
                    subj = subj.substring(1);
                } else {
                    _StashPush({_nodeType: ast.CamusNodeType.InlineStyle, style: ['super'], text: _parseInline(matchres[1])});
                    subj = subj.substring(matchres[0].length);
                }
            }
        } else if (subj[0] === '_' && subj[1] && subj[1] !== '_') {    // subscript
            subj = subj.substring(1);
            if (!subj[0]) { _StashPush('_'); }
            else {
                matchres = REGEX_SUPSUB_TEXT.exec(subj);
                if (!matchres) {
                    _StashPush({_nodeType: ast.CamusNodeType.InlineStyle, style: ['sub'], text: [subj[0]]})
                    subj = subj.substring(1);
                } else {
                    _StashPush({_nodeType: ast.CamusNodeType.InlineStyle, style: ['sub'], text: _parseInline(matchres[1])});
                    subj = subj.substring(matchres[0].length);
                }
            }
        } else {
            if ('*/`'.includes(subj[0])
                    || subj.startsWith('~~')
                    || subj.startsWith('__')
                    || subj.startsWith('{=') || subj.startsWith('=}')) {
                if (stack.includes(subj[0])
                    || (subj.startsWith('~~') && stack.includes('~~'))
                    || (subj.startsWith('__') && stack.includes('__'))
                    || (subj.startsWith('=}') && stack.includes('{='))) {
                    // x[0] in stack.
                    // NOTE: now there's a problem. if we have an input like this:
                    //     *_bold underline*_
                    // what should we do about this?
                    // now (2021.12.6) we decide it should be equivalent with:
                    //     <b>_bold underline</b>_
                    // because style character pushes array onto stash, we can restore the original stuff.
                    // e.g.:
                    //     *bold _boldu ~~budelete*
                    // which should be:
                    //     <b>bold _boldu ~~budelete</b>
                    // is with a stash and stack of:
                    //     stash=['normal ',['bold'],['boldu '],['budelete']]
                    //     stack=[*_~~]
                    // when the last * is seen. we rewind the stack & it'll be:
                    //     ['_'] + ['boldu '] + ['~~'] + ['budelete']
                    // which results in ['_', 'boldu ', '~~', 'budelete']
                    // so the rewind algorithm:
                    //     rewindStash = []
                    //     while stack.top !== subj[0]:
                    //         rewindStash = stash.pop() + rewindStash
                    //         rewindStash = [stack.pop()] + rewindStash
                    //     stashTopArray = stashTopArray + rewindStash
                    // which will leave stash & stack with:
                    //     stash=['normal ',['bold','_','boldu ','~~','budelete']]
                    //     stack=[*]
                    // which then we follow the normal procedure.
                    let rewindStash: ast.CamusInlineNode[] = [];
                    while (
                        (subj.startsWith('~~') && stack[stack.length-1] && stack[stack.length-1] !== '~~')
                        || (subj.startsWith('__') && stack[stack.length-1] && stack[stack.length-1] !== '__')
                        || (subj.startsWith('=}') && stack[stack.length-1] && stack[stack.length-1] !== '{=')
                        || (!subj.startsWith('~~') && !subj.startsWith('__') && !subj.startsWith('=}')
                                && stack[stack.length-1] && (stack[stack.length-1] !== subj[0]))
                    ) {
                        let stashTop = stash.pop()!
                        rewindStash = [
                            stack.pop()!,
                            ...(Array.isArray(stashTop)? stashTop : [stashTop]),
                            ...rewindStash
                        ];
                    }
                    let stashTop = stash[stash.length-1] as ast.CamusLine;
                    ASSERT('stashTop should an array.', Array.isArray(stashTop));
                    stash[stash.length-1] = [...stashTop, ...rewindStash];
                    // now we resolve stack top:
                    let styleArray: ('bold'|'italics'|'underline'|'delete'|'highlight'|'code')[] = [];
                    let s = stack.pop();
                    styleArray.push(
                        s === '*'? 'bold'
                        : s === '/'? 'italics'
                        : s === '__'? 'underline'
                        : s === '`'? 'code'
                        : s === '{='? 'highlight'
                        : 'delete'
                    );
                    let lastStashTop = stash.pop();
                    let newNode: ast.InlineStyleNode = {_nodeType: ast.CamusNodeType.InlineStyle, style: styleArray, text: lastStashTop as any};
                    _StashPush(newNode);
                    subj = subj.substring((subj.startsWith('~~') || subj.startsWith('__') || subj.startsWith('=}'))? 2 : 1);
                } else {
                    // x[0] not in stack.
                    stash.push([]);
                    stack.push(subj.startsWith('~~')? '~~' : subj.startsWith('__')? '__' : subj.startsWith('{=')? '{=' : subj[0]);
                    subj = subj.substring((subj.startsWith('~~') || subj.startsWith('__') ||  subj.startsWith('{='))? 2 : 1);
                }
            } else if (subj[0] === '\\') {
                if (subj[1]) {
                    _StashPush(subj[1]); subj = subj.substring(2);
                } else {
                    _StashPush(subj[0]);
                    subj = subj.substring(1);
                }
            } else {
                let i = 0;
                while (subj[i]
                    && (!'*/_~^=`\\'.includes(subj[i])
                        || (subj[i] === '~' && subj[i+1] !== '~')
                        || (subj[i] === '=' && subj[i+1] !== '}'))
                    && !_checkIfSpecialTreatmentRequiredInline(subj.substring(i))) {
                    i++;
                }
                _StashPush(subj.substring(0, i));
                subj = subj.substring(i);
            }
        }
    }
    // NOTE: there shouldn't be any inline style left at the end of the line.
    // if there is, we need to rewind just like above.
    let rewindStash: ast.CamusInlineNode[] = [];
    while (stack.length > 0) {
        let stashTop = stash.pop()!
        rewindStash = [
            stack.pop()!,
            ...(Array.isArray(stashTop)? stashTop : [stashTop]),
            ...rewindStash
        ];
    }
    // Now there shouldn't be any array in the stash.
    ASSERT('at the end of finishing rewind stash should not contain array',
        !rewindStash.map((v) => Array.isArray(v as any)).reduce((a, b) => a || b, false)
    );
    stash = stash.concat(rewindStash);
    ASSERT('at the end of _parseInline stash should be an ast.CamusLine',
        stash.map((v) => ast.isCamusInlineNode(v as any)).reduce((a, b) => a && b, true)
    )
    return stash as ast.CamusLine;
}


// NOTE:
// 1.  a logic line means:
//         a.  one line of heading.
//         b.  one block (the one started with `#{`).
//         c.  one horizontal rule.
//         d.  multiple lines of block quote text (started with `>`) with no blank lines
//             in between.
//         e.  multiple list item with (1) same bullet (2) same indent (3) no blank lines
//             in between.
//         f.  multiple line after a footnote text id with an indent longer than the id
//             and no blank lines in between, e.g.:
//                 [1]:blahblahblah
//                     blahblahblahblha
//                     blahblablah
//             and:
//                 [1]: blahblahblah
//                          blahblahblahblha
//                              blahblablah
//             the 3 lines of blahblahblah belongs to one single logic line, because
//             they have an indent longer than `[1]:`.
//         g.  multiple line with no line-level or block-level style and no blank lines
//             in between.
// 2.  camus does not support nested block nodes (the one started with `#{`).
//     if need to input literal text `#}`:
//         a.  indent the whole content; camus consider the string `#}` *with no indent*
//             as the end of a block. any indent from the indented content will be removed
//             accordingly, e.g.:
//                 #{code javascript
//                   function hanoi(x, y, z) {
//                       console.log("hello, world!");
//                   }
//                 #}
//             each line of the block of code inside has the indent of 2 spaces, 6 spaces
//             and 2 spaces respectively, the shortest indent is 2 space, so 2 spaces of
//             indent is removed to form the parsing result.
//         b.  if for any reasons you need to write `#}` with no indent, write `\#}`.
const REGEX_HEADING = /^(={1,6})\s+(.*)$/;
const REGEX_FOOTNOTE_TEXT = /^(\[((?:\\\}|\\\]|[^}\]\s])*)\]:\s*)(.*)$/;
const REGEX_HORIZONTAL_RULE = /^-{5,}/;
const REGEX_QUOTE = /^(>\s+)(.*)/;
const REGEX_BLOCK_START = /^#\{([^\s]+)?(?:\s+(.*))?/;
const REGEX_BLOCK_END = /^#\}/;
const REGEX_UNORDERED_LIST_HEAD = /^(([\+-])(\s+))(.*)/;
const REGEX_ORDERED_LIST_HEAD = /^(([0-9]+)\.(\s+))(.*)/;
const REGEX_TRIM_LEFT = /^(\s*)/;
const REGEX_TABLE_CELL = /^((?:\\\||[^|])*)(\|)?/;
const VERBATIM_BLOCK_TYPES = [
    'verbatim',
    'code',
    'ignore',
    'raw'
];

function _splitTableCell(x: string): string[] {
    let res: string[] = [];
    let subj = x;
    while (subj.length > 0) {
        let matchres = REGEX_TABLE_CELL.exec(subj);
        if (!matchres) {
            res.push(subj);
            break;
        }
        res.push(matchres[1]);
        subj = subj.substring(matchres[0].length);
    }
    return res;
}

function _checkIfSpecialTreatmentRequired(x: string): boolean {
    return !!(
        REGEX_HEADING.exec(x)
        || REGEX_FOOTNOTE_TEXT.exec(x)
        || REGEX_HORIZONTAL_RULE.exec(x)
        || REGEX_QUOTE.exec(x)
        || REGEX_BLOCK_START.exec(x)
        || REGEX_BLOCK_END.exec(x)
        || REGEX_UNORDERED_LIST_HEAD.exec(x)
        || REGEX_ORDERED_LIST_HEAD.exec(x)
    );
}

function _parseSingleLogicLine(x: string[], n: number): [ast.CamusLogicLine, number]|undefined {
    if (n >= x.length) { return undefined; }
    let matchres;
    if (matchres = REGEX_HEADING.exec(x[n])) {
        return [
            [{_nodeType: ast.CamusNodeType.Heading, level: matchres[1].length, text: _parseInline(matchres[2].trim())}],
            n+1
        ];
    } else if (matchres = REGEX_HORIZONTAL_RULE.exec(x[n])) {
        return [
            [{_nodeType: ast.CamusNodeType.HorizontalRule}],
            n+1
        ];
    } else if (matchres = REGEX_QUOTE.exec(x[n])) {
        let i = n+1;
        let matchres2;
        let minprefix: string = matchres[1];
        while ((x[i] !== undefined) && (matchres2 = REGEX_QUOTE.exec(x[i]))) {
            i++;
            if (minprefix.length > matchres2[1].length) {
                minprefix = matchres2[1];
            }
        }
        let subdoc = x.slice(n, i);
        let subdocRes = _parseDocument(subdoc.map((v) => v.substring(minprefix.length)));
        return [
            [{_nodeType: ast.CamusNodeType.Block, type: 'quote', arg: '', text: subdocRes}],
            i
        ];
    } else if (matchres = REGEX_BLOCK_START.exec(x[n])) {
        let type = matchres[1]?.trim();
        let args = matchres[2]?.trim();
        let i = n+1;
        let matchres2;
        let subdoc: string[] = [];
        let minindent: number = +Infinity;
        // NOTE: empty lines does not count when calculating minimal indent.
        while ((x[i] !== undefined) && !(REGEX_BLOCK_END.exec(x[i]))) {
            matchres2 = REGEX_TRIM_LEFT.exec(x[i]);
            if (x[i] && x[i].trim() && minindent > matchres2![1].length) {
                minindent = matchres2![1].length;
            }
            subdoc.push((x[i] === '\\#}')? '#}' : x[i]);
            i++;
        }
        i++;
        
        let subdocNoIndent = subdoc.map((v) => v.substring(minindent))
        let subdocRes: ast.CamusBlockNode;
        if (type.toLowerCase() === 'table') {
            let section1: ast.CamusLine[][] = [];
            let section2: ast.CamusLine[][] = [];
            let subj = section1;
            let isHeadSeparatorPassed = false;
            subdocNoIndent.forEach((v) => {
                if (!REGEX_HORIZONTAL_RULE.exec(v)) {
                    subj.push(_splitTableCell(v).map((v) => _parseInline(v)));
                } else {
                    subj = section2;
                    isHeadSeparatorPassed = true;
                }
            });
            subdocRes =
                {_nodeType: ast.CamusNodeType.Table,
                    header: (isHeadSeparatorPassed || section2.length <= 0)? section1 : [],
                    body: (isHeadSeparatorPassed || section2.length <= 0)? section2 : section1,
                };
        } else {

            subdocRes =
                {_nodeType: ast.CamusNodeType.Block,
                    type: type,
                    arg: args,
                    text: VERBATIM_BLOCK_TYPES.includes(type)? subdocNoIndent.map((v) => [v]) : _parseDocument(subdocNoIndent)
                };
        }
        
        return [
            [subdocRes],
            i
        ];
    } else if (matchres = REGEX_FOOTNOTE_TEXT.exec(x[n])) {
        let i;
        let matchres2;
        let footnoteTextList: ast.FootnoteTextNode[] = [];
        do {
            i = n+1;
            let indent = matchres[1].length;
            let subdoc: string[] = [x[n].substring(indent).trim()];
            while ((x[i] !== undefined) && (matchres2 = REGEX_TRIM_LEFT.exec(x[i]))) {
                // NOTE: empty lines does not count when checking indent.
                if (!x[i] || !x[i].trim() || (matchres2[1].length >= indent)) {
                    subdoc.push(x[i].substring(indent));
                    i++;
                } else {
                    break;
                }
            }
            let parsedSubdoc = _parseDocument(subdoc);
            let subdocRes: ast.FootnoteTextNode = {
                _nodeType: ast.CamusNodeType.FootnoteText,
                id: matchres[2],
                text: parsedSubdoc
            };
            footnoteTextList.push(subdocRes);
            n = i;
        } while ((x[n] !== undefined) && (matchres = REGEX_FOOTNOTE_TEXT.exec(x[n])));
        return [
            [{_nodeType: ast.CamusNodeType.FootnoteBlock, content: footnoteTextList}],
            n
        ];
    } else if (matchres = REGEX_UNORDERED_LIST_HEAD.exec(x[n])) {
        let i;
        let matchres2;
        let listItemList: ast.ListItemNode[] = [];
        do {
            i = n+1;
            let indent = matchres[1].length;
            let subdoc: string[] = [x[n].substring(indent).trim()];
            while ((x[i] !== undefined) && (matchres2 = REGEX_TRIM_LEFT.exec(x[i]))) {
                // NOTE: empty lines does not count when checking indent.
                if (!x[i] || !x[i].trim() || (matchres2[1].length >= indent)) {
                    subdoc.push(x[i].substring(indent));
                    i++;
                } else {
                    break;
                }
            }
            let parsedSubdoc = _parseDocument(subdoc);
            let listItem: ast.ListItemNode = {
                _nodeType: ast.CamusNodeType.ListItem,
                text: parsedSubdoc
            };
            listItemList.push(listItem);
            n = i;
        } while ((x[n] !== undefined) && (matchres = REGEX_UNORDERED_LIST_HEAD.exec(x[n])));
        return [
            [{_nodeType: ast.CamusNodeType.List, ordered: false, items: listItemList}],
            n
        ];
    } else if (matchres = REGEX_ORDERED_LIST_HEAD.exec(x[n])) {
        let i;
        let matchres2;
        let listItemList: ast.ListItemNode[] = [];
        do {
            i = n+1;
            let indent = matchres[1].length;
            let subdoc: string[] = [x[n].substring(indent).trim()];
            while ((x[i] !== undefined) && (matchres2 = REGEX_TRIM_LEFT.exec(x[i]))) {
                // NOTE: empty lines does not count when checking indent.
                if (!x[i] || !x[i].trim() || (matchres2[1].length >= indent)) {
                    subdoc.push(x[i].substring(indent));
                    i++;
                } else {
                    break;
                }
            }
            let parsedSubdoc = _parseDocument(subdoc);
            let listItem: ast.ListItemNode = {
                _nodeType: ast.CamusNodeType.ListItem,
                text: parsedSubdoc
            };
            listItemList.push(listItem);
            n = i;
        } while ((x[n] !== undefined) && (matchres = REGEX_ORDERED_LIST_HEAD.exec(x[n])));
        return [
            [{_nodeType: ast.CamusNodeType.List, ordered: true, items: listItemList}],
            n
        ];
    } else {
        let i = n;
        if (x[i] !== undefined) {
            if (!x[i] || !x[i].trim()) {
                while ((x[i] !== undefined) && (!x[i] || !x[i].trim())) {
                    i++;
                }
                return [[], i];
            } else {
                while (x[i] && x[i].trim() && !_checkIfSpecialTreatmentRequired(x[i])) {
                    i++;
                }
                return [
                    x.slice(n, i).map((v) => _parseInline(v)).reduce((a, b) => a.concat(b), []),
                    i
                ];
            }
        }
    }
}

function _parseDocument(x: string[]): ast.CamusLogicLine[] {
    let result: ast.CamusLogicLine[] = [];
    let n = 0;
    while (x[n] !== undefined) {
        let parseSingleResult = _parseSingleLogicLine(x, n);
        if (parseSingleResult) {
            if (parseSingleResult[0].length > 0) {
                result.push(parseSingleResult[0]);
            }
            n = parseSingleResult[1];
        } else {
            result.push(_parseInline(x[n]));
            n++;
        }
    }
    return result;
}

export function parse(x: string): ast.CamusLogicLine[] {
    let res = _parseDocument(x.replace(/\r\n/g, '\n').split('\n'));
    return res;
}

