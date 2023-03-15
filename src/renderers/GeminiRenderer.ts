import * as ast from "../AST";
import { PrettyPrinter } from "../PrettyPrinter";

// basic renderer for text/gemini.

export type GeminiRenderOption = {
    additionalHead?: string[],
    additionalStylesheet?: string[],
    replacePunctuation?: {
        singleQuote?: [string, string],
        doubleQuote?: [string, string],
        singleDash?: string,
        doubleDash?: string,        
    }
}

// NOTE: punctuations inside inline code should not be affected.
export class GeminiRenderer {
    protected _additionalHead: string[] = [];
    protected _externalStylesheet: string[] = [];
    protected _replacePunctuation: {
        singleQuote?: [string, string],
        doubleQuote?: [string, string],
        singleDash?: string,
        doubleDash?: string,        
    }|undefined = undefined;
    protected _pp: PrettyPrinter = new PrettyPrinter();
    constructor(options?: GeminiRenderOption) {
        if (options) {
            this._additionalHead = options.additionalHead || [];
            this._externalStylesheet = options.additionalStylesheet || [];
            this._replacePunctuation = options.replacePunctuation;
        }
    }

    render(x: ast.CamusLogicLine[]) {
        this._pp.clear();
        x.forEach((v) => this._renderLogicLine(v));
        return this._pp.result;
    }

    
    protected _singleQuote: boolean = false;
    protected _doubleQuote: boolean = false;
    protected _renderLine(x: ast.CamusLine) {
        this._singleQuote = false;
        this._doubleQuote = false;
        x.forEach((v) => this._render(v));
    }
    protected _renderLogicLine(x: ast.CamusLogicLine, noWrapper: boolean = false) {
        this._singleQuote = false;
        this._doubleQuote = false;
        let firstPassed = false;
        x.forEach((v) => {
            if (!noWrapper && ast.isCamusInlineNode(v)) {
                if (!firstPassed) {
                    this._pp.string('<p>');
                    firstPassed = true;
                }
            } else {
                if (!noWrapper && firstPassed) {
                    this._pp.string('</p>').line().indent();
                    firstPassed = false;
                }
            }
            this._render(v);
        });
        if (!noWrapper && firstPassed) {
            this._pp.string('</p>').line();
        }
    }
    protected _render(x: ast.CamusNode) {
        if (typeof x === 'string') {
            this._text(x);
        } else {
            switch (x._nodeType) {
                case ast.CamusNodeType.Heading: { this._heading(x); break; }
                case ast.CamusNodeType.Block: { this._block(x); break; }
                case ast.CamusNodeType.InlineStyle: { this._inlineStyle(x); break; }
                case ast.CamusNodeType.Tag: { this._tag(x); break; }
                case ast.CamusNodeType.Link: { this._link(x); break; }
                case ast.CamusNodeType.Ref: { this._ref(x); break; }
                case ast.CamusNodeType.FootnoteRef: { this._footnoteRef(x); break; }
                case ast.CamusNodeType.FootnoteText: { this._footnoteText(x); break; }
                case ast.CamusNodeType.FootnoteBlock: { this._footnoteBlock(x); break; }
                case ast.CamusNodeType.Image: { this._image(x); break; }
                case ast.CamusNodeType.Table: { this._table(x); break; }
                case ast.CamusNodeType.List: { this._list(x); break; }
                case ast.CamusNodeType.InlineIgnore: { break; }
                case ast.CamusNodeType.HorizontalRule: { this._pp.line().indent().string('<hr />').line(); break; }
                default: {
                    this._pp.string(`${x}`);
                }
            }
        }
    }

    protected _text(n: string) {
        let s: string = n;
        if (this._replacePunctuation) {
            if (!this._replacePunctuation.singleQuote && !this._replacePunctuation.doubleQuote) {
                s = s.replace(/--/g, this._replacePunctuation.doubleDash || '--').replace(/-/g, this._replacePunctuation.singleDash || '-');
            } else {
                let singleQuote: [string, string] = this._replacePunctuation.singleQuote || ["'", "'"];
                let doubleQuote: [string, string] = this._replacePunctuation.doubleQuote || ['"', '"'];
                let r: string[] = [];
                for (let i = 0; i < n.length; i++) {
                    switch (n[i]) {
                        case '"': {
                            r.push(doubleQuote[this._doubleQuote?1:0]);
                            this._doubleQuote = !this._doubleQuote;
                            break;
                        }
                        case "'": {
                            r.push(singleQuote[this._singleQuote?1:0]);
                            this._singleQuote = !this._singleQuote;
                            break;
                        }
                        default: {
                            r.push(n[i]);
                            break;
                        }
                    }
                }
                s = r.join('');
            }
        } else {
            s = n;
        }
        this._pp.string(s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
    }
    protected _heading(n: ast.HeadingNode) {
        this._pp.indent().string(`<h${n.level}>`);
        this._renderLine(n.text);
        this._pp.string(`</h${n.level}>`).line();
    }
    protected _tag(n: ast.TagNode) {
        this._pp.string(`<a name="${n.id}"></a>`);
    }
    protected _table(n: ast.TableNode) {
        // TODO: fix this.
        this._pp.indent().string('<table>').line().addIndent();
        if (n.header.length > 0) {
            this._pp.indent().string('<thead>').line().addIndent();
            n.header.forEach((r) => {
                this._pp.indent().string('<tr>').line().addIndent();
                r.forEach((j) => {
                    this._pp.indent().string('<th>').line().addIndent();
                    this._renderLine(j);
                    this._pp.removeIndent().indent().string('</th>').line();
                });
                this._pp.removeIndent().indent().string('</tr>').line();
            });
            this._pp.removeIndent().indent().string('</thead>').line();
        }
        if (n.body.length > 0) {
            this._pp.indent().string('<tbody>').line().addIndent();
            n.body.forEach((r) => {
                this._pp.indent().string('<tr>').line().addIndent();
                r.forEach((j) => {
                    this._pp.indent().string('<td>').line().addIndent();
                    this._renderLine(j);
                    this._pp.removeIndent().indent().string('</td>').line();
                });
                this._pp.removeIndent().indent().string('</tr>').line();
            });
            this._pp.removeIndent().indent().string('</tbody>').line();
        }
        this._pp.removeIndent().indent().string(`</table>`).line();
    }
    protected _block(n: ast.BlockNode) {
        if (n.type === 'ignore') { return; }
        
        switch (n.type) {
            // NOTE: in `verbatim` and `code`, assumes both only contain strings.
            // NOTE(2023.3.14): in text/gemini you don't get extra syntax coloring.
            case 'verbatim': case 'code': {
                this._pp.string('```').line();
                n.text.forEach((v) => {
                    v.forEach((j) => { this._text(j as string); this._pp.line(); });
                });
                this._pp.string('```').line();
                break;
            }
            case 'raw': {
                n.text.forEach((v) => {
                    v.forEach((j) => { this._pp.string(j as string); this._pp.line(); });
                });
                break;
            }
            case 'quote': {
                n.text.forEach((v) => { this._pp.string(`> `); this._renderLogicLine(v); });
                break;
            }
            default: {
                // NOTE: we'll do it like verbatim.
                this._pp.string('```').line();
                n.text.forEach((v) => {
                    v.forEach((j) => { this._text(j as string); this._pp.line(); });
                });
                this._pp.string('```').line();
                break;
            }
        }

        return;
    }
    protected _inlineStyle(n: ast.InlineStyleNode) {
        // NOTE: those motherfuckers have been denying inline style for fucking years. it's
        //       part of the reason why in the fucking fuck i once quitted gemini.
        //       we'll do it the supposed "more moral" style. fuck those stupid motherfuckers.
        let startingDict = {
            'bold': '*',
            'italics': '/',
            'underline': '__',
            'delete': '~~',
            'code': '`',
            'super': '^',
            'sub': '_',
            'highlight': '#',
        };
        let endingDict = {
            'bold': '*',
            'italics': '/',
            'underline': '__',
            'delete': '~~',
            'code': '`',
            'super': '^',
            'sub': '_',
            'highlight': '#',
        }
        let start = n.style.map((v) => `<${startingDict[v]}>`).join('');
        let end = n.style.reverse().map((v) => `</${endingDict[v]}>`).join('');
        this._pp.string(start);
        this._renderLine(n.text);
        this._pp.string(end);
    }
    protected _link(n: ast.LinkNode) {
        // TODO: probably should make it into footnote.
        this._pp.string(`=> ${n.url} `)
        if (n.text && n.text.filter((v) => v && (typeof v !== 'string' || v.trim())).length > 0) {
            this._renderLine(n.text);
        }
        this._pp.line();
    }
    protected _ref(n: ast.RefNode) {
        // TODO: fix this.
        // NOTE: core lib does nothing on ref nodes.
        // to make use of ref node, extends from CamusHTMLRenderer or write your own.
        if (n.path.startsWith('#')) {
            this._pp.string(`<a href="${n.path}">`);
            if (n.text && n.text.filter((v) => v && (typeof v !== 'string' || v.trim())).length > 0) {
                this._renderLine(n.text);
            } else {
                this._pp.string(n.path);
            }
            this._pp.string('</a>');
        } else {
            this._pp.string('');
        }
    }
    protected _footnoteRef(n: ast.FootnoteRefNode) {
        this._pp.string(`[${n.idList.join(',')}]`);
    }
    protected _footnoteText(n: ast.FootnoteTextNode) {
        this._pp.string(`[${n.id}]: `);
        n.text.forEach((v, i) => this._renderLogicLine(v, i === 0));
    }
    protected _footnoteBlock(n: ast.FootnoteBlockNode) {
        this._pp.line();
        n.content.forEach((v) => {
            this._footnoteText(v);
        });
        this._pp.line();
    }
    protected _image(n: ast.ImageNode) {
        // NOTE: gemini only supported links. some client may render links to image.
        //       some may not. i have no control over this.
        this._pp.string(`=> ${n.url} ${n.alt}`).line();
    }
    protected _list(n: ast.ListNode) {
        n.items.forEach((v, i) => {
            this._pp.string(n.ordered? `${i+1}.  ` : '* ');
            v.text.forEach((v, i) => this._renderLogicLine(v, i===0));
        });
    }
    preamble() {
        // intentionally left blank.
    }
    postamble() {
        this._pp.line();
    }
}


