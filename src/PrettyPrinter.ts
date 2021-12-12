export class PrettyPrinter {
    private _res: string[] = [];
    private _indent: string = '';
    addIndent() {
        this._indent = this._indent + '    ';
        return this;
    }
    removeIndent() {
        this._indent = this._indent.substring(0, this._indent.length - 4);
        return this;
    }
    indent() {
        this._res.push(this._indent);
        return this;
    }
    line() {
        this._res.push('\n');
        return this;
    }
    string(x: string) {
        this._res.push(x);
        return this;
    }
    get result() {
        return this._res.join('');
    }
    clear() {
        this._res = [];
        this._indent = '';
    }
}
