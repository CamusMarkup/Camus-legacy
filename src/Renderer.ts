import * as ast from "./AST";
import { PrettyPrinter } from "./PrettyPrinter";

export type HTMLRendererOption = {
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
export class HTMLRenderer {
    protected _additionalHead: string[] = [];
    protected _externalStylesheet: string[] = [];
    protected _replacePunctuation: {
        singleQuote?: [string, string],
        doubleQuote?: [string, string],
        singleDash?: string,
        doubleDash?: string,        
    }|undefined = undefined;
    protected _pp: PrettyPrinter = new PrettyPrinter();
    constructor(options?: HTMLRendererOption) {
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
            this._pp.line();
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
                case ast.CamusNodeType.InlineCode: { this._inlineCode(x); break; }
                case ast.CamusNodeType.Link: { this._link(x); break; }
                case ast.CamusNodeType.Ref: { this._ref(x); break; }
                case ast.CamusNodeType.FootnoteRef: { this._footnoteRef(x); break; }
                case ast.CamusNodeType.FootnoteText: { this._footnoteText(x); break; }
                case ast.CamusNodeType.FootnoteBlock: { this._footnoteBlock(x); break; }
                case ast.CamusNodeType.Image: { this._image(x); break; }
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
        if (this._replacePunctuation) {
            if (!this._replacePunctuation.singleQuote && !this._replacePunctuation.doubleQuote) {
                this._pp.string(n.replace(/--/g, this._replacePunctuation.doubleDash || '--').replace(/-/g, this._replacePunctuation.singleDash || '-'));
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
                this._pp.string(r.join(''));
            }
        } else {
            this._pp.string(n);
        }
    }
    protected _heading(n: ast.HeadingNode) {
        this._pp.indent().string(`<h${n.level}>`);
        this._renderLine(n.text);
        this._pp.string(`</h${n.level}>`).line();
    }
    protected _block(n: ast.BlockNode) {
        if (n.type === 'ignore') { return; }
        
        switch (n.type) {
            // NOTE: in `verbatim` and `code`, assumes both only contain strings.
            case 'verbatim': {
                this._pp.indent().string(`<pre ${n.arg? `class="${n.arg}"` : ''}>`).line().addIndent();
                n.text.forEach((v) => {
                    v.forEach((j) => { this._text(j as string); this._pp.line(); });
                });
                this._pp.removeIndent().indent().string(`</pre>`).line();
                break;
            }
            case 'code': {
                this._pp.indent().string(`<pre class="code code-${n.arg}">`).line().addIndent();
                n.text.forEach((v) => {
                    v.forEach((j) => { this._text(j as string); this._pp.line(); });
                });
                this._pp.removeIndent().indent().string(`</pre>`).line();
                break;
            }
            case 'quote': {
                this._pp.indent().string(`<blockquote>`).line().addIndent();
                n.text.forEach((v) => { this._renderLogicLine(v); });
                this._pp.removeIndent().indent().string(`</blockquote>`).line();
                break;
            }
            default: {
                this._pp.indent().string(`<div class="block-${n.arg||''}">`).line().addIndent();
                n.text.forEach((v) => { this._renderLogicLine(v); });
                this._pp.removeIndent().indent().string(`</div>`).line();
                break;
            }
        }

        return;
    }
    protected _inlineStyle(n: ast.InlineStyleNode) {
        let start = n.style.map((v) => `<${v}>`).join('').replace(/bold/g, 'b').replace(/italics/g, 'i').replace(/underline/g, 'span style="text-decoration:underline"').replace(/delete/g, 'del');
        let end = n.style.map((v) => `</${v}>`).join('').replace(/bold/g, 'b').replace(/italics/g, 'i').replace(/underline/g, 'span').replace(/delete/g, 'del');
        this._pp.string(start);
        this._renderLine(n.text);
        this._pp.string(end);
    }
    protected _inlineCode(n: ast.InlineCodeNode) {
        this._pp.string(`<code>${n.text}</code>`);
    }
    protected _link(n: ast.LinkNode) {
        this._pp.string(`<a href="${n.url}">${n.text||n.url}</a>`);
    }
    protected _ref(n: ast.RefNode) {
        // NOTE: core lib does nothing on ref nodes.
        // to make use of ref node, extends from CamusHTMLRenderer or write your own.
        this._pp.string('');
    }
    protected _footnoteRef(n: ast.FootnoteRefNode) {
        this._pp.string(`<sup><a href="#cite-${n.id}">[${n.id}]</a></sup>`);
    }
    protected _footnoteText(n: ast.FootnoteTextNode) {
        this._pp.indent().string(`<div class="footnote-item">[<a name="cite-${n.id}">${n.id}</a>] `);
        n.text.forEach((v, i) => this._renderLogicLine(v, i === 0));
        this._pp.removeIndent().indent().string(`</div>`).line();
    }
    protected _footnoteBlock(n: ast.FootnoteBlockNode) {
        this._pp.indent().string('<div class="footnote">').line().addIndent();
        n.content.forEach((v) => {
            this._footnoteText(v);
        });
        this._pp.removeIndent().string('</div>').line();
    }
    protected _image(n: ast.ImageNode) {
        this._pp.string(`<img src="${n.url}" alt="${n.alt}" />`);
    }
    protected _list(n: ast.ListNode) {
        let tagName = n.ordered? 'ol' : 'ul';
        this._pp.line().indent().string(`<${tagName}>`).line().addIndent();
        n.items.forEach((v) => {
            this._pp.indent().string(`<li>`);
            v.text.forEach((j) => j.forEach((k) => this._render(k)));
            this._pp.string(`</li>`).line();
        });
        this._pp.removeIndent().indent().string(`</${tagName}>`).line();
    }
    preamble() {
        this._pp.string('<html>').line().addIndent()
            .indent().string('<head>').line().addIndent();
        if (this._additionalHead) {
            this._additionalHead.forEach((v) => {
                this._pp.indent().string(v).line();
            });
        }
        if (this._externalStylesheet) {
            this._externalStylesheet.forEach((v) => {
                this._pp.indent().string(`<link rel="stylesheet" href="${encodeURIComponent(v)}">`).line();
            });
        }
        this._pp.removeIndent().indent().string('</head>').line()
            .indent().string('<body>').line()
            .addIndent();
    }
    postamble() {
        this._pp.line().removeIndent().indent().string('</body>').line()
            .removeIndent().string('</html>').line()
                .line();
    }
}

