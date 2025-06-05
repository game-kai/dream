'use strict';

// 要素
const body = document.body;
const canvas = document.querySelector('#canvas');



const Screen = class {

    #canvas;
    #context;
    #image;

    constructor (canvas) {
        this.#canvas = canvas
        this.#context = this.#canvas.getContext('2d');
        this.#image = document.createElement('img');
        this.#image.src = 'sprite.png';
        this.#context.fillStyle = '#000';
    }

    refresh () {
        this.#context.fillRect(0, 0, this.#canvas.width, this.#canvas.height);
    }

    drawChar (cx, cy, cw, ch, dx, dy) {
        if(!this.#image.complete) return;

        const charWidth = 16;
        const charHeight = 16;

        const x = cx * charWidth;
        const y = cy * charHeight;
        const w = cw * charWidth;
        const h = ch * charHeight;
        this.#context.drawImage(this.#image, x, y, w, h, dx, dy, w, h);
    }
}
const screen = new Screen(canvas);



const Sprite = class {

    static charWidth = 16;
    static charHeight = 16;
    #screen = null;
    #cx;
    #cy;
    #cw;
    #ch;
    #x;
    #y;

    constructor (screen) {
        this.#screen = screen;
    }

    changeChar (cx, cy, cw, ch) {
        this.#cx = cx;
        this.#cy = cy;
        this.#cw = cw;
        this.#ch = ch;
    }

    setPosition (x, y) {
        this.#x = x;
        this.#y = y;
    }

    draw () {
        this.#screen.drawChar(this.#cx, this.#cy, this.#cw, this.#ch, this.#x, this.#y);
    }

    hitTest (px, py) {
        return (
            this.#x <= px &&
            px < this.#x + this.#cw * Sprite.charWidth &&
            this.#y <= py &&
            py < this.#y + this.#ch * Sprite.charHeight
        );
    }
}


// マウスとタッチのポインター情報を管理するクラス
const Pointer = class {

    #canvas = null;
    #x = 0;
    #y = 0;
    #down = -1;
    #count = -1;

    constructor (canvas) {
        this.#canvas = canvas;
    }

    // マウスとタッチのイベントから呼ばれて更新
    update (x, y, down) {
        const rect = this.#canvas.getBoundingClientRect()
        const left = rect.left;
        const top = rect.top;
        const width = rect.width;
        const height = rect.height;

        this.#x = Math.floor((x - left) / width * this.#canvas.width);
        this.#y = Math.floor((y - top) / height * this.#canvas.height);

        // 0が送られてくるとそのまま、1は押されているに更新、-1は押されていないに更新
        if(down !== 0 && this.#down !== down) {
            this.#count = -1;
            this.#down = down;
        }
    }

    // ゲームのフレームから呼んでポインター情報を返す
    poll () {
        this.#count++;
        return {
            x: this.#x,
            y: this.#y,
            down: this.#down,
            count: this.#count,
        };
    }
}
const pointer = new Pointer(canvas);


// 音声を再生するクラス
const Sound = class {
    
    #soundNote = null;
    #audioContext = null;
    #oscillatorNode = null;
    #gainNode = null;

    constructor () {
        // 音声の周波数計算
        this.#soundNote = []
        let nextFreq = Math.pow(2, 1 / 12)
        let f = 49; // ラの音の高さ
        for(let n = 0; n < 12 * 8; n++){
            this.#soundNote[n] = f
            f *= nextFreq
        }
    }

    // 音声開始
    start () {
        if(this.#audioContext === null) this.#audioContext = new AudioContext();

        if (this.#audioContext.state === 'suspended') this.#audioContext.resume();

        this.#oscillatorNode = new OscillatorNode(this.#audioContext);
        this.#oscillatorNode.type = "square";

        this.#gainNode = this.#audioContext.createGain();
        this.#gainNode.gain.value = 0.5;

        this.#oscillatorNode.connect(this.#gainNode).connect(this.#audioContext.destination);
        this.#oscillatorNode.start(0);

        this.#gainNode.gain.linearRampToValueAtTime(0, this.#audioContext.currentTime);
    }

    // 音声再生
    play (startNote, time, endNote) {
        this.#gainNode.gain.setValueAtTime(0, this.#audioContext.currentTime);
        this.#gainNode.gain.linearRampToValueAtTime(0.2, this.#audioContext.currentTime + 0.001);
        this.#gainNode.gain.linearRampToValueAtTime(0.2, this.#audioContext.currentTime + time - 0.001);
        this.#gainNode.gain.linearRampToValueAtTime(0, this.#audioContext.currentTime + time);

        this.#oscillatorNode.frequency.setValueAtTime(this.#soundNote[startNote], this.#audioContext.currentTime);
        this.#oscillatorNode.frequency.linearRampToValueAtTime(this.#soundNote[endNote], this.#audioContext.currentTime + time);
    }
}
const sound = new Sound();




// すべてのゲームのスーパークラス
const Game = class {

    #point = 0;
    #pointSprite = new Array(2); // 点数のスプライト
    #menuButtonSprite = null; // メニューに戻るボタンのスプライト

    constructor (screen) {
        this.#menuButtonSprite = new Sprite(screen);
        this.#menuButtonSprite.changeChar(5, 0, 1, 1);
        this.#menuButtonSprite.setPosition(0, 0);
        
        for(let i = 0; i < this.#pointSprite.length; i++) {
            this.#pointSprite[i] = new Sprite(screen);
            this.#pointSprite[i].changeChar(6, 0, 1, 1);
            this.#pointSprite[i].setPosition(canvas.width - Sprite.charWidth * (i + 1), 0);
        }
    }

    // 最初に呼ぶ
    start () {

    }

    // 毎フレーム呼ぶ
    poll (deltaTime, pointer) {
        // メニューに戻るボタンが押されたら終了
        if(
            pointer.down === 1 &&
            pointer.count === 0 &&
            this.#menuButtonSprite.hitTest(pointer.x, pointer.y)
        ) return true;  // ゲームが終了したことを示す

        this.#draw();

        return false;  // ゲームが終了していない
    }

    #draw () {
        this.#menuButtonSprite.draw();
        this.#pointSprite[0].draw();
        this.#pointSprite[1].draw();
    }

    // ポイントのスプライトを更新
    #updatePointSprite () {
        const digit1 = this.#point % 10;
        const digit10 = Math.floor(this.#point / 10) % 10;
        this.#pointSprite[0].changeChar(6 + digit1, 0, 1, 1);
        this.#pointSprite[1].changeChar(6 + digit10, 0, 1, 1);
    }

    // ポイントを返す
    get point () {
        return this.#point;
    }

    // ポイントを設定する
    set point (point) {
        this.#point = point;
        this.#updatePointSprite();
    }

    // ポイントを加算する
    addPoint (point) {
        this.#point += point;
        this.#updatePointSprite();
    }
}

// くじびきのクラス
const Kujibiki = class extends Game {

    #sprite = new Array(10); // くじのスプライト
    #sharkId = -1; // サメくじのインデックス
    #sharkFlag = false; // サメくじをすでに引いたかどうか
    #drawCount = -1; // 描画したフレームをカウント

    constructor (screen) {
        super(screen);
        
        for(let i = 0; i < this.#sprite.length; i++) {
            this.#sprite[i] = new Sprite(screen);
            this.#sprite[i].changeChar(2, 0, 1, 1);
            this.#sprite[i].setPosition(Sprite.charWidth * (1.5 + i % 5 * 2), Sprite.charHeight * (4.5 + Math.floor(i / 5) * 2));
        }
    }

    start () {
        super.start();

        // サメくじを設定
        this.#sharkId = Math.floor(Math.random() * this.#sprite.length);
        this.#sharkFlag = false;

        super.point = 10; // ポイントを初期化

        this.#drawCount = -1;
    }

    poll (deltaTime, pointer) {
        const end = super.poll(deltaTime, pointer);
        if(end) return super.point; // ゲームが終了したらポイントを返す

        this.#push(pointer);
        this.#draw();

        return 100;  // ゲームが終了していないことを示す
    }

    #draw () {
        this.#drawCount++;

        // サメくじのアニメーション
        if(
            this.#drawCount % 30 !== 0 &&
            this.#sharkFlag
        ) {
            for(let i = 0; i < this.#sprite.length; i++) {
                const s = this.#sprite[i];
                if(i !== this.#sharkId) continue;
                if(Math.floor(this.#drawCount / 30) % 2 === 0) {
                    s.changeChar(0, 0, 1, 1);
                } else {
                    s.changeChar(1, 0, 1, 1);
                }
            }
        }

        // 全くじを描画
        for(let i = 0; i < this.#sprite.length; i++) {
            const s = this.#sprite[i];
            s.draw();
        }
    }

    #push (pointer) {
        if(
            pointer.down !== 1 ||
            pointer.count !== 0 ||
            this.#sharkFlag
        ) return;

        // くじを引いたら開ける
        for(let i = 0; i < this.#sprite.length; i++) {
            const s = this.#sprite[i];
            if(!s.hitTest(pointer.x, pointer.y)) continue;

            // サメを引いた
            if(i === this.#sharkId) {
                s.changeChar(0, 0, 1, 1);
                this.#sharkFlag = true;

                // 最後に引いたかどうかで音の高さが違う
                if(super.point !== 1) sound.play(16, 0.1, 16);
                else sound.play(64, 0.4, 64);
            }
            // サメ以外を引いた
            else {
                s.changeChar(3, 0, 1, 1);
                sound.play(52, 0.05, 52);
            }
            this.addPoint(-1);
        }
    }
}

// もぐらたたきのクラス
const Mogura = class extends Game {

    constructor (screen) {
        super(screen);
    }

    start () {
        super.start();
    }

    poll (deltaTime, pointer) {
        const end = super.poll(deltaTime, pointer);
        if(end) return super.point;

        this.#push(pointer);
        this.#draw();

        return 100;
    }

    #draw () {
    }

    #push (pointer) {
        if(
            pointer.down !== 1 ||
            pointer.count !== 0
        ) return;
    }
}

// 倉庫脱出のクラス
const Souko = class extends Game {

    constructor (screen) {
        super(screen);
    }

    start () {
        super.start();
    }

    poll (deltaTime, pointer) {
        const end = super.poll(deltaTime, pointer);
        if(end) return super.point;


        this.#push(pointer);
        this.#draw();

        return 100;
    }

    #draw () {
    }

    #push (pointer) {
        if(
            pointer.down !== 1 ||
            pointer.count !== 0
        ) return;
    }
}

// ブロック崩しのクラス
const Ball = class extends Game {

    constructor (screen) {
        super(screen);
    }

    start () {
        super.start();
    }

    poll (deltaTime, pointer) {
        const end = super.poll(deltaTime, pointer);
        if(end) return super.point;


        this.#push(pointer);
        this.#draw();

        return 100;
    }

    #draw () {
    }

    #push (pointer) {
        if(
            pointer.down !== 1 ||
            pointer.count !== 0
        ) return;
    }
}

// ドットイートのクラス
const Doteat = class extends Game {

    constructor (screen) {
        super(screen);
    }

    start () {
        super.start();
    }

    poll (deltaTime, pointer) {
        const end = super.poll(deltaTime, pointer);
        if(end) return super.point;


        this.#push(pointer);
        this.#draw();

        return 100;
    }

    #draw () {
    }

    #push (pointer) {
        if(
            pointer.down !== 1 ||
            pointer.count !== 0
        ) return;
    }
}

// シューティングのクラス
const Shooting = class extends Game {

    constructor (screen) {
        super(screen);
    }

    start () {
        super.start();
    }

    poll (deltaTime, pointer) {
        const end = super.poll(deltaTime, pointer);
        if(end) return super.point;


        this.#push(pointer);
        this.#draw();

        return 100;
    }

    #draw () {
    }

    #push (pointer) {
        if(
            pointer.down !== 1 ||
            pointer.count !== 0
        ) return;
    }
}

// ジャンプのクラス
const Jump = class extends Game {

    constructor (screen) {
        super(screen);
    }

    start () {
        super.start();
    }

    poll (deltaTime, pointer) {
        const end = super.poll(deltaTime, pointer);
        if(end) return super.point;


        this.#push(pointer);
        this.#draw();

        return 100;
    }

    #draw () {
    }

    #push (pointer) {
        if(
            pointer.down !== 1 ||
            pointer.count !== 0
        ) return;
    }
}


// ゲーム全体のクラス
const Dream = class {

    #game = null;
    #gameId = -1;
    #gameName = '';
    #isTitle = true;
    #prevTimestamp = 0
    #screen = null;
    #pointer = null;
    #titleSprite = null;
    #menuSprite = {};
    #menuClass = {};
    #menuPoint = {};
    #menuArray = [
        'kujibiki',
        'mogura',
        'souko',
        'ball',
        'doteat',
        'shooting',
        'jump',
    ];
    #menuNote = [
        60,
        62,
        64,
        65,
        67,
        69,
        71,
    ];
    #menuPointSprite = {};

    constructor (screen, pointer) {
        this.#screen = screen;
        this.#pointer = pointer;
        this.#titleSprite = new Sprite(screen);
        this.#menuArray.forEach((name) => {
            this.#menuSprite[name] = new Sprite(screen);
            this.#menuPointSprite[name] = new Array(2);
            this.#menuPointSprite[name][0] = new Sprite(screen);
            this.#menuPointSprite[name][1] = new Sprite(screen);
        });
        this.#menuClass['kujibiki'] = Kujibiki;
        this.#menuClass['mogura'] = Mogura;
        this.#menuClass['souko'] = Souko;
        this.#menuClass['ball'] = Ball;
        this.#menuClass['doteat'] = Doteat;
        this.#menuClass['shooting'] = Shooting;
        this.#menuClass['jump'] = Jump;
    }

    start () {
        this.#isTitle = true;

        // スプライトのキャラを設定
        this.#titleSprite.changeChar(0, 7, 16, 1);
        for(let i = 0; i < this.#menuArray.length; i++) {
            this.#menuSprite[this.#menuArray[i]].changeChar(0, 8 + i, 15, 1);
        }

        // キャラの幅と高さを取得
        const cw = Sprite.charWidth;
        const ch = Sprite.charHeight;

        // スプライトの位置を設定
        this.#titleSprite.setPosition(1.5 * cw, 5 * ch);
        for(let i = 0; i < this.#menuArray.length; i++) {
            this.#menuSprite[this.#menuArray[i]].setPosition(0, (i + 2) * ch);
        }

        // ポイントの初期化
        for(let i = 0; i < this.#menuArray.length; i++) {
            this.#menuPoint[this.#menuArray[i]] = 100;
            this.#menuPointSprite[this.#menuArray[i]][0].changeChar(6, 1, 1, 1);
            this.#menuPointSprite[this.#menuArray[i]][1].changeChar(6, 1, 1, 1);
            this.#menuPointSprite[this.#menuArray[i]][0].setPosition(canvas.width - cw, (i + 2) * ch);
            this.#menuPointSprite[this.#menuArray[i]][1].setPosition(canvas.height - cw * 2, (i + 2) * ch);
        }

        this.#gameId = -1;
        this.#gameName = '';

        requestAnimationFrame(this.#frame.bind(this));
    }

    // ゲームタイトルを押したら実行
    #pushTitle (pointer) {
        if(
            !this.#isTitle ||
            pointer.down === -1 ||
            pointer.count !== 0
        ) return;
        this.#titleSprite.setPosition(0, 0);
        this.#isTitle = false;
    }

    // ゲームタイトルを押したら実行
    #pushMenu (pointer) {
        if(
            this.#isTitle ||
            pointer.down === -1 ||
            pointer.count !== 0 ||
            this.#game !== null
        ) return;


        for(let i = 0; i < this.#menuArray.length; i++) {
            const m = this.#menuArray[i];
            if(!this.#menuSprite[m].hitTest(pointer.x, pointer.y)) continue;
            this.#gameId = i; // ゲームIDを設定
            this.#gameName = m; // ゲーム名を設定
            this.#game = new this.#menuClass[m](this.#screen);
            this.#game.start();
            const note = this.#menuNote[i];
            sound.play(note, 0.05, note + 12); // メニュー選択音を再生
        }
    }

    // メニューのスプライト描画
    #drawTitle () {
        if(
            !this.#isTitle
        ) return;
        this.#titleSprite.draw();
    }

    // メニューのスプライト描画
    #drawMenu () {
        if(
            this.#isTitle ||
            this.#game !== null
        ) return;
        this.#titleSprite.draw();
        this.#menuArray.forEach((name) => {
            this.#menuSprite[name].draw();
            this.#menuPointSprite[name][0].draw();
            this.#menuPointSprite[name][1].draw();
        });
    }

    // ゲームをポーリング
    #pollGame (deltaTime, pointer) {
        if(this.#game === null) return;
        const point = this.#game.poll(deltaTime, pointer);

        // ゲームが終了
        if(point < 100) {
            this.#updatePoint(this.#gameName, point); // ポイントを更新
            
            // 終了音
            const note = this.#menuNote[this.#gameId];
            sound.play(note, 0.05, note - 12);

            this.#gameId = -1;
            this.#gameName = '';
            this.#game = null;
        }
    }

    #updatePoint(gameName, point) {
        if(this.#menuPoint[gameName] <= point) return;
        this.#menuPoint[gameName] = point;
        const digit1 = point % 10;
        const digit10 = Math.floor(point / 10) % 10;
        this.#menuPointSprite[gameName][0].changeChar(6 + digit1, 0, 1, 1);
        this.#menuPointSprite[gameName][1].changeChar(6 + digit10, 0, 1, 1);
    }

    #frame (timestamp) {
        requestAnimationFrame(this.#frame.bind(this));
        this.#prevTimestamp = timestamp;
        const deltaTime = (timestamp - this.#prevTimestamp) / 1000;
        
        const p = this.#pointer.poll(); // ポインターの状態を取得

        this.#pushMenu(p); // メニュー項目を押したか判定
        this.#pushTitle(p); // タイトルを押したか判定

        
        this.#screen.refresh(); // 画面を黒く塗りつぶす

        this.#drawMenu(); // メニューのスプライト描画
        this.#drawTitle(); // タイトルのスプライト描画
        
        this.#pollGame(deltaTime, p); // ゲームの実行
    }
}
const dream = new Dream(screen, pointer);
dream.start();




// キャンバスの押下
canvas.addEventListener('mousedown', (e) => {
    pointer.update(e.clientX, e.clientY, 1);
});
canvas.addEventListener('touchstart', (e) => {
    pointer.update(e.touches[0].clientX, e.touches[0].clientY, 1);
});
// キャンバス上のポインター移動
canvas.addEventListener('mousemove', (e) => {
    pointer.update(e.clientX, e.clientY, 0);
});
canvas.addEventListener('touchmove', (e) => {
    pointer.update(e.touches[0].clientX, e.touches[0].clientY, 0);
});
// キャンバスの押下終了
canvas.addEventListener('mouseup', (e) => {
    pointer.update(e.clientX, e.clientY, -1);
    sound.start();
});
canvas.addEventListener('touchend', (e) => {
    pointer.update(0, 0, -1);
    sound.start();
});

// キャンバス以外は押しても無効
const stopEvent = (e) => {
    e.preventDefault();
    return false;
}
body.addEventListener('mousedown', stopEvent, { passive: false })
body.addEventListener('mousemove', stopEvent, { passive: false })
body.addEventListener('mouseup', stopEvent, { passive: false })
body.addEventListener('touchstart', stopEvent, { passive: false })
body.addEventListener('touchmove', stopEvent, { passive: false })
body.addEventListener('touchend', stopEvent, { passive: false })
body.addEventListener('click', stopEvent, { passive: false });

// 画面がブラウザに復帰した
document.addEventListener('visibilitychange', (e) => {
    if (!document.hidden) {
    }
});