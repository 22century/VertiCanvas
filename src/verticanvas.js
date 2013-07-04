/**
 * VertiCanvas（仮称）
 * Canvas縦書き組版ライブラリー
 *
 * @auther 22century
 * @license MIT license
 * @version 0.1
 */

(function(window){

    /**
     * VertiCanvas
     * @param {object} options
     * @constructor
     */
    var VertiCanvas = function(options){

        for (var protoName in VertiCanvas.prototype) {
            if (VertiCanvas.prototype.hasOwnProperty(protoName)) {
                if (options.hasOwnProperty(protoName)
                && protoName.indexOf("_") !== 0
                && typeof options[protoName] !== "function"
                ) {
                    this[protoName] = options[protoName];
                }
            }
        }

        this.initialize();
    };

    VertiCanvas.prototype = {

        // public
        text             : "",
        width            : 100,
        height           : 100,
        mainCanvasId     : "reader",
        fontSize         : 16,
        fontFamily       : "serif",
        lineHeight       : 10,

        // private
        _charAry         : [],
        _imageCache      : {},
        _cache           : {},
        _lastPoint       : 0,
        _mainCanvas      : null,
        _mainContext     : null,
        _workCanvasId    : "work",
        _workCanvas      : null,
        _workContext     : null,
        _fontStyle       : "",
        _letterSpacing   : "",
        _patternSpace    : new RegExp("[\t ]"),
        _patternNewline  : new RegExp("[\r\n]"),
        _patternAlphaNum : new RegExp("[a-zA-Z0-9]"),
        _debug: true,

        /**
         * initialize
         */
        initialize: function(){

            console.log("initialize:");

            var canvas = document.getElementById(this._workCanvasId);
            if (!canvas || !canvas.getContext) {
                return;
            }

            this._fontStyle = ["normal", this.fontSize + "px", this.fontFamily].join(" ");
            this.setupCanvas();
            this.text = this.replaceLineBreak(this.text);
            this._charAry = this.getCharArray(this.text);
            this.renderCanvas(this._charAry);

            this.initialize = null;
        },

        nextPage: function(){
            this.resetMainCanvas();
            this.renderCanvas(this._charAry, this._lastPoint);
        },

        prevPage: function(){
            this.resetMainCanvas();
            this.renderCanvas(this._charAry, this._lastPoint);
        },

        getMarginMap: function(){
            var map = [];
            for (var i= 0,l=this.fontSize;i<l;i++) {
                map[i] = 0;
            }
            return map;
        },

        /**
         * CANVAS設定
         */
        setupCanvas: function(){

            this._mainCanvas = document.getElementById(this.mainCanvasId);
            this._mainCanvas.width = this.width;
            this._mainCanvas.height = this.height;

            this._mainContext = this._mainCanvas.getContext("2d");
            this._mainContext.font = this._fontStyle;
            this._mainContext.save();

            this._workCanvas = document.getElementById(this._workCanvasId);
            this._workCanvas.width = this.fontSize;
            this._workCanvas.height = this.fontSize;

            this._workContext = this._workCanvas.getContext("2d");
            this._workContext.font = this._fontStyle;
            this._workContext.save();

        },

        /**
         * 改行コードを統一
         * @param {string} chr
         * @returns {string}
         */
        replaceLineBreak: function(chr){
            return chr.split(this._patternNewline).join("\n");
        },

        /**
         * 一文字ずつの配列を作成（サロゲートペアは2つで1セット）
         * @param {string} chr
         * @returns {Array}
         */
        getCharArray: function(chr){

            var charAry = [];
            var hCode, lCode;

            for (var i= 0,l=chr.length; i<l; i++) {
                hCode = chr.charCodeAt(i);
                // 上位サロゲート
                if ((0xD800 <= hCode && hCode <= 0xDBFF)) {
                    lCode = chr.charCodeAt(i + 1);
                    // 下位サロゲート
                    if (0xDC00 <= lCode && lCode <= 0xDFFF) {
                        charAry[charAry.length] = String.fromCharCode(hCode, lCode);
                    }
                    ++ i;
                } else {
                    charAry[charAry.length] = chr[i];
                }
            }

            return charAry;
        },

        /**
         * 空白判定
         * @param {string} chr
         * @returns {boolean}
         */
        isSpace: function(chr){
            return this._patternSpace.test(chr);
        },

        /**
         * 改行判定
         * @param {string} chr
         * @returns {boolean}
         */
        isLineBreak: function(chr){
            return this._patternNewline.test(chr);
        },

        /**
         * 英数判定
         * @param {string} chr
         * @returns {boolean}
         */
        isAlphaNum: function(chr){
            return this._patternAlphaNum.test(chr);
        },

        /**
         * 行頭禁則文字
         * @param {string} chr
         * @returns {boolean}
         */
        isNotAllowedStart: function(chr){
            return "）。.,)]｝、〕〉》」』】〙〗〟’”｠»・:;/‐゠–〜～?!‼⁇⁈⁉".indexOf(chr) !== -1;
        },

        /**
         * 行末禁則文字
         * @param {string} chr
         * @returns {boolean}
         */
        isNotAllowedEnd: function(chr){
            return "（([｛〔〈《「『【〘〖〝‘“｟«".indexOf(chr) !== -1;
        },

        /**
         * 始め括弧
         * @param {string} chr
         * @returns {boolean}
         */
        isOpeningBracket: function(chr){
            return "（([｛〔〈《「『【〘〖〝‘“｟«".indexOf(chr) !== -1;
        },

        /**
         * 閉じ括弧
         * @param {string} chr
         * @returns {boolean}
         */
        isClosingBracket: function(chr){
            return "）)]｝〕〉》」』】〙〗〟’”｠»".indexOf(chr) !== -1;
        },

        /**
         * 長音符
         * @param {string} chr
         * @returns {boolean}
         */
        isHyphen: function(chr){
            return "ー‐゠–〜～".indexOf(chr) !== -1;
        },

        /**
         * 句読点
         * @param {string} chr
         * @returns {boolean}
         */
        isPunctuation: function(chr){
            return "｡。．.、，".indexOf(chr) !== -1;
        },

        /**
         * メインCanvasの消去
         */
        resetMainCanvas: function(){
            this._mainContext.setTransform(1, 0, 0, 1, 0, 0);
            this._mainContext.clearRect(0, 0, this.width, this.height);
        },

        /**
         * 作業用Canvasの消去
         */
        resetWorkCanvas: function(){
            this._workContext.setTransform(1, 0, 0, 1, 0, 0);
            this._workContext.clearRect(0, 0, 100, 100);
        },

        /**
         * 英数字の縦書き
         * @param {string} chr
         * @param {number} x
         * @param {number} y
         */
        fillAlphaNum: function(chr, x, y){
            if (typeof this._imageCache[chr] === "undefined") {
                this._workContext.rotate(90/180 * Math.PI);
                this._workContext.fillText(chr, 0, 0);
                this._imageCache[chr] = this._workContext.getImageData(0, 0, this.fontSize, this.fontSize);
                this.resetWorkCanvas();
            }
            this._mainContext.putImageData(this._imageCache[chr], x + this.fontSize / 10, y - this.fontSize + this.fontSize/4);
        },

        /**
         * 長音符の縦書き
         * @param {string} chr
         * @param {number} x
         * @param {number} y
         */
        fillHyphen: function(chr, x, y){

            var cache;

            if (typeof this._cache[chr] === "undefined") {

                // 回転＋反転
                this._workContext.rotate(90 / 180 * Math.PI);
                this._workContext.transform(1, 0, 0, -1, 0, 0);

                // プリレンダー
                this._workContext.fillText(chr, 0, this.fontSize);
                var image = this._workContext.getImageData(0, 0, this.fontSize, this.fontSize);
                var exData = this.getFillExtent(image);

                // 最小範囲で再選択
                image = this._workContext.getImageData(exData.left, 0, exData.originWidth, this.fontSize);

                this.resetWorkCanvas();

                // イメージキャッシュ
                cache = this._cache[chr] = {
                    "image"  : image,
                    "exData" : exData
                };
            }
            else {
                cache = this._cache[chr];
            }

            this._mainContext.putImageData(
                cache.image,
                x + cache.exData.horizontalMargin,
                y + cache.exData.verticalMargin - this.fontSize
            );
        },

        /**
         * 始め括弧の縦書き
         * @param {string} chr
         * @param {number} x
         * @param {number} y
         */
        fillOpeningBracket: function(chr, x, y){
            if (typeof this._imageCache[chr] === "undefined") {
                this._workContext.rotate(90/180 * Math.PI);
                this._workContext.transform(1, 0, 0, -1, 0, 0);
                this._workContext.fillText(chr, 0 , this.fontSize - (this.fontSize/10));
                this._imageCache[chr] = this._workContext.getImageData(0, 0, this.fontSize, this.fontSize);
                this.resetWorkCanvas();
            }
            this._mainContext.putImageData(this._imageCache[chr] , x, y - this.fontSize - this.fontSize/10);
        },

        /**
         * 閉じ括弧の縦書き
         * @param {string} chr
         * @param {number} x
         * @param {number} y
         */
        fillClosingBracket: function(chr, x, y){
            if (typeof this._imageCache[chr] === "undefined") {
                this._workContext.rotate(90/180 * Math.PI);
                this._workContext.transform(1, 0, 0, -1, 0, 0);
                this._workContext.fillText(chr, 0 , this.fontSize - (this.fontSize/10));
                this._imageCache[chr] = this._workContext.getImageData(0, 0, this.fontSize, this.fontSize);
                this.resetWorkCanvas();
            }
            this._mainContext.putImageData(this._imageCache[chr], x, y - (this.fontSize/2));
        },

        /**
         * 句読点の位置調節
         * @param {string} chr
         * @param {number} x
         * @param {number} y
         */
        fillPunctuation: function(chr, x, y){
            this._mainContext.fillText(chr, x    + this.fontSize / 2, y - this.fontSize / 2);
        },

        /**
         * CanvasのImageDataから文字の塗りつぶし範囲を取得
         * @param {ImageData} imageData
         * @returns {object}
         */
        getFillExtent: function(imageData){
            var u8ca = imageData.data;
            var r, g, b, a;
            var x = 0, y = 0;
            var hMargin = this.getMarginMap();
            var vMargin = this.getMarginMap();
            var xFound = false;

            for (var i=0,l=u8ca.length;i<l;i+=4) {
                r = u8ca[i + 0];
                g = u8ca[i + 1];
                b = u8ca[i + 2];
                a = u8ca[i + 3];

                // 現ラインで色があったフラグ
                if (a !== 0) {
                    xFound = true;
                } else {
                    // debug
                    imageData.data[i + 3] = 40;
                }

                // X方向の余白リスト
                if (hMargin[x] === 0) {
                    hMargin[x] = (a === 0) ? 0 : 1;
                }

                // x終端
                if (x === this.fontSize -1) {
                    // Y方向の余白リスト
                    vMargin[y] = (!xFound) ? 0 : 1;
                    x = 0;
                    ++ y;
                    xFound = false;
                    continue;
                }
                ++ x;
            }

            // 余白情報のオブジェクト
            var exData = {
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                originWidth: 0,
                originHeight: 0,
                verticalMargin: 0,
                horizontalMargin: 0
            };

            // 縦
            for (i = 0, l = vMargin.length; i < l; i++) {
                if (vMargin[i] === 0) {
                    if (i < l / 2) { ++ exData.top; }
                    else { ++ exData.bottom; }
                }
            }

            // 横
            for (i = 0, l = hMargin.length; i < l; i++) {
                if (hMargin[i] === 0) {
                    if (i < l / 2) { ++ exData.left; }
                    else { ++ exData.right; }
                }
            }

            exData.originWidth  = imageData.width - exData.left - exData.right;
            exData.originHeight = imageData.height - exData.top - exData.bottom;

            exData.horizontalMargin = (exData.left + exData.right) / 2;
            exData.verticalMargin   = (exData.top + exData.bottom) / 2;

            return exData;
        },

        /**
         * canvasに描画
         * @param {Array} charAry
         */
        renderCanvas: function(charAry /*, startPint */){

            var startPint = arguments[1]||0;
            var hSize = this._mainCanvas.width / (this.fontSize + this.lineHeight) | 0;
            var vSize = this._mainCanvas.height / this.fontSize | 0;

            console.log("hSize:", hSize, "vSize", vSize);

            var x = 0, y = 0;
            var hCount = 0, vCount = 0, tCount = 0;
            var chr;

            for (var i = startPint, l = charAry.length; i < l; i++)
            {
                ++ tCount;

                chr = charAry[i];

                // 全角以外の空白文字
                if (this.isSpace(chr)) {
                    continue;
                }

                // 改行コードによる強制改行
                if (this.isLineBreak(chr)) {
                    vCount = 0;
                    ++ hCount;
                    continue;
                }

                // 文字送り
                ++ vCount;

                // 行末禁則処理
                if (vSize -1 === vCount) {
                    if (this.isNotAllowedEnd(chr)) {
                        vCount = 1;
                        ++ hCount;
                    }
                }

                // 文字数オーバーによる自然改行
                if (vSize <= vCount) {
                    // 行頭禁則処理、連続する場合は無視
                    if ( !(this.isNotAllowedStart(chr) && vSize === vCount) ) {
                        vCount = 1;
                        ++ hCount;
                    }
                }

                // ページ終端
                if (hSize <= hCount) {
                    break;
                }

                // 描画座標
                x = this._mainCanvas.width - (this.fontSize) - (hCount * (this.fontSize + this.lineHeight)) - this.lineHeight;
                y = this.fontSize * vCount;

                // debug
                if (this._debug) {
                    this._mainContext.fillStyle = "rgb(200, 200, 200)";
                    this._mainContext.fillRect(x, y - this.fontSize, this.fontSize, this.fontSize);
                    this._mainContext.fillStyle = "rgb(0, 0, 0)";
                }

                // 文字種毎の特殊対応 ----------

                // 半角英数
                if (this.isAlphaNum(chr)) {
                    this.fillAlphaNum(chr, x, y);
                }
                // 長音符
                else if (this.isHyphen(chr)) {
                    this.fillHyphen(chr ,x, y);
                }
                // 始め括弧
                else if (this.isOpeningBracket(chr)) {
                    this.fillOpeningBracket(chr, x, y);
                }
                // 閉じ括弧
                else if (this.isClosingBracket(chr)) {
                    this.fillClosingBracket(chr, x, y);
                }
                // 句読点
                else if (this.isPunctuation(chr)) {
                    this.fillPunctuation(chr, x, y);
                }
                // その他
                else {
                    this._mainContext.fillText(chr, x, y);
                }

            }

            this._lastPoint = tCount -1;

        }

    };

    window.VertiCanvas = VertiCanvas;

})(window);
