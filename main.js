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



// ゲームのスプライトのクラス
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

    addPosition (dx, dy) {
        this.#x += dx;
        this.#y += dy;
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

    get x () {
        return this.#x;
    }
    get y () {
        return this.#y;
    }
    get cx () {
        return this.#cx;
    }
    get cy () {
        return this.#cy;
    }
    get cw () {
        return this.#cw;
    }
    get ch () {
        return this.#ch;
    }
}



// すべてのゲームのスーパークラス
const Game = class {

    #point = 99; // ポイント
    #pointSprite = new Array(2); // 点数のスプライト
    #menuButtonSprite = null; // メニューに戻るボタンのスプライト

    constructor (screen) {
        this.#menuButtonSprite = new Sprite(screen);
        this.#menuButtonSprite.changeChar(5, 0, 1, 1);
        this.#menuButtonSprite.setPosition(0, 0);
        
        for(let i = 0; i < this.#pointSprite.length; i++) {
            this.#pointSprite[i] = new Sprite(screen);
            this.#pointSprite[i].changeChar(15, 0, 1, 1);
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

        return false;  // ゲームが終了していない
    }

    draw () {
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
        if(this.#point < 0) this.#point = 0;
        if(this.#point >= 100) this.#point = 99;
        this.#updatePointSprite();
    }

    // ポイントを中央に表示する
    centerPoint () {
        for(let i = 0; i < this.#pointSprite.length; i++) {
            this.#pointSprite[i].setPosition((4 - i) * Sprite.charWidth, 3.5 * Sprite.charHeight);
        }
    }
}

// くじびきのクラス
const Kujibiki = class extends Game {

    #sprite = new Array(8); // くじのスプライト
    #sharkId = -1; // サメくじのインデックス
    #sharkFlag = false; // サメくじをすでに引いたかどうか
    #time = 0; // スタートからの時間
    #prevTime = 0; // 前回ポーリングの時間

    constructor (screen) {
        super(screen);
        
        for(let i = 0; i < this.#sprite.length; i++) {
            this.#sprite[i] = new Sprite(screen);
            this.#sprite[i].changeChar(2, 0, 1, 1);
            this.#sprite[i].setPosition(
                Sprite.charWidth * (0.5 + i % 4 * 2),
                Sprite.charHeight * (2.5 + Math.floor(i / 4) * 2)
            );
        }
    }

    start () {
        super.start();

        // サメくじを設定
        this.#sharkId = Math.floor(Math.random() * this.#sprite.length);
        this.#sharkFlag = false;

        super.point = 8; // ポイントを初期化

        this.#prevTime = 0; // 前回の時間を初期化
        this.#time = 0; // 現在の時間を初期化
    }

    poll (deltaTime, pointer) {
        const end = super.poll(deltaTime, pointer);
        if(end && this.#sharkFlag) return super.point; // ゲームが終了したらポイントを返す
        if(end) return -1; // ゲームを中断したらポイントは返さない

        this.#prevTime = this.#time; // 前回の時間に代入
        this.#time += deltaTime;

        this.#push(pointer);

        return 100;  // ゲームが終了していないことを示す
    }

    draw () {
        super.draw();

        // サメくじのアニメーション
        if(
            Math.floor((this.#time * 2) % 2) !== Math.floor((this.#prevTime * 2) % 2) &&
            this.#sharkFlag
        ) {
            for(let i = 0; i < this.#sprite.length; i++) {
                const s = this.#sprite[i];
                if(i !== this.#sharkId) continue;
                if(Math.floor((this.#time * 2) % 2) === 0) {
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
                if(super.point !== 1) sound.play(16, 0.08, 16);
                else sound.play(64, 0.4, 64);
            }
            // サメ以外を引いた
            else {
                s.changeChar(3, 0, 1, 1);
                sound.play(52, 0.05, 58);
            }
            this.addPoint(-1);
        }
    }
}

// もぐらたたきのクラス
const Mogura = class extends Game {

    #sprite = new Array(9); // 穴のスプライト
    #time = 0; // スタートからの時間
    #prevTime = 0; // 前回ポーリングの時間
    #resultFlag = false; // 結果が出たかどうか
    #second = 5; // もぐらが出る秒間隔
    #order = [ // もぐらの出現順序
        [
            0, 0, 0,
            0, 1, 0,
            0, 0, 0,
        ],
        [
            0, 0, 0,
            1, 0, 1,
            0, 0, 0,
        ],
        [
            0, 1, 0,
            0, 0, 0,
            0, 1, 0,
        ],
        [
            1, 0, 0,
            0, 0, 0,
            0, 0, 1,
        ],
        [
            0, 0, 1,
            0, 0, 0,
            1, 0, 0,
        ],
        [
            1, 0, 1,
            0, 0, 0,
            1, 0, 1,
        ],
        [
            0, 0, 0,
            1, 1, 1,
            0, 0, 0,
        ],
        [
            0, 1, 0,
            0, 1, 0,
            0, 1, 0,
        ],
        [
            0, 1, 0,
            1, 0, 1,
            0, 1, 0,
        ],
        [
            1, 0, 1,
            0, 1, 0,
            1, 0, 1,
        ],
        [
            0, 0, 0,
            0, 1, 0,
            0, 0, 0,
        ],
        [
            1, 1, 1,
            1, 1, 1,
            1, 1, 1,
        ],
    ]
    #state = [
        0, 0, 0,
        0, 0, 0,
        0, 0, 0,
    ]

    constructor (screen) {
        super(screen);
        
        // 穴のスプライトを初期化
        for(let i = 0; i < this.#sprite.length; i++) {
            this.#sprite[i] = new Sprite(screen);
            this.#sprite[i].changeChar(2, 1, 1, 1);
            this.#sprite[i].setPosition(
                Sprite.charWidth * (1.5 + i % 3 * 2),
                Sprite.charHeight * (1.5 + Math.floor(i / 3) * 2)
            );
        }
    }

    start () {
        super.start();

        super.point = 38; // ポイントを初期化

        this.#state = [
            0, 0, 0,
            0, 0, 0,
            0, 0, 0,
        ]
    }

    poll (deltaTime, pointer) {
        const end = super.poll(deltaTime, pointer);
        if(end && this.#resultFlag) return super.point;
        if(end) return -1;

        // スタートからの経過時間
        this.#prevTime = this.#time;
        this.#time += deltaTime;

        const len = this.#order.length;
        const ft = Math.floor(this.#time / this.#second);
        const fpt = Math.floor(this.#prevTime / this.#second)

        // もぐらが出る瞬間の処理
        if(ft !== fpt && 0 < ft && ft <= len) {
            const phase = Math.floor(this.#time / this.#second - 1)
            this.#order[phase].forEach((v, i) => {
                if(this.#order[phase][i] === 0) return; // もぐらが出ない場合は次の穴
                this.#sprite[i].changeChar(0, 1, 1, 1); // 穴のスプライトを変更
                this.#state[i] = 1; // 穴にいるもぐらの状態を1にする
            });
        }

        // もぐらが残る時間と消える瞬間の処理
        if(
            Math.floor(this.#time % this.#second) === this.#second - 1 &&
            Math.floor(this.#prevTime % this.#second) !== this.#second - 1
        ) {
            this.#sprite.forEach((v, i) => {
                this.#sprite[i].changeChar(2, 1, 1, 1); // 穴のスプライトを元に戻す
                this.#state[i] = 0; // もぐらの状態を0にする
            });
        }

        // 終了時
        if(ft > len && fpt <= len) {
            if(super.point !== 0) sound.play(18, 0.4, 18); // もぐらを残して終了した音を再生
            else sound.play(66, 0.8, 66); // 全部叩いた場合の音を再生
            this.#resultFlag = true; // 結果が出たフラグを立てる
            super.centerPoint(); // ポイントを中央に表示
        }

        this.#push(pointer);

        return 100;
    }

    draw () {
        super.draw();

        // 終了していなければ穴やもぐらを描画
        if(this.#resultFlag) return;
        for(let i = 0; i < this.#sprite.length; i++) {
            this.#sprite[i].draw();
        }
    }

    #push (pointer) {
        if(
            pointer.down !== 1 ||
            pointer.count !== 0
        ) return;

        // もぐらを叩いたら変化させる
        this.#sprite.forEach((s, i) => {
            if(this.#state[i] !== 1) return; // もぐらがいない場合は次へ
            if(!s.hitTest(pointer.x, pointer.y)) return; // 叩いていない穴は次へ

            this.#state[i] = 2; // 叩かれたもぐらの状態を2にする

            s.changeChar(1, 1, 1, 1); // 叩かれたもぐらのスプライトを変化させる

            this.addPoint(-1);

            sound.play(42, 0.05, 30); // 叩いた音を再生
        });
    }
}

// 倉庫のクラス
const Souko = class extends Game {

    #playerSprite = null; // プレイヤーのスプライト
    #stageWidth = 8;
    #stageHeight = 7;
    #stage = [
        [
            [0, 0, 0, 3, 3, 2, 3, 3,],
            [0, 0, 0, 3, 0, 0, 0, 3,],
            [3, 3, 3, 3, 1, 1, 1, 3,],
            [3, 0, 0, 0, 0, 0, 0, 3,],
            [3, 1, 1, 0, 0, 0, 0, 3,],
            [3, 9, 1, 0, 3, 3, 3, 3,],
            [3, 3, 3, 3, 3, 0, 0, 0,],
        ],
        [
            [0, 3, 3, 3, 3, 3, 3, 0,],
            [0, 3, 0, 0, 0, 9, 3, 0,],
            [3, 3, 1, 1, 1, 1, 3, 3,],
            [3, 0, 0, 0, 0, 0, 0, 3,],
            [3, 3, 1, 1, 1, 3, 3, 3,],
            [3, 0, 0, 0, 0, 0, 0, 3,],
            [3, 3, 3, 3, 3, 2, 3, 0,],
        ],
        [
            [3, 3, 3, 3, 3, 3, 3, 3,],
            [3, 9, 0, 1, 0, 1, 0, 3,],
            [3, 0, 0, 1, 1, 0, 3, 3,],
            [3, 1, 1, 1, 0, 1, 0, 2,],
            [3, 0, 0, 1, 0, 0, 3, 3,],
            [3, 0, 1, 0, 1, 0, 0, 3,],
            [3, 3, 3, 3, 3, 3, 3, 3,],
        ],
    ] // ブロックの初期状態
    #currentStage = 0; // 現在のステージ
    #blockSprite = new Array(this.#stage.length);
    #time = 0; // スタートからの時間
    #goalWait = 0; // ゴール時の待ち時間

    constructor (screen) {
        super(screen);

        // スプライトの初期化
        this.#playerSprite = new Sprite(screen);
        for(var y = 0; y < this.#stageHeight; y++) {
            this.#blockSprite[y] = new Array(this.#stageWidth);
            for(var x = 0; x < this.#stageWidth; x++) {
                this.#blockSprite[y][x] = new Sprite(screen);
            }
        }
    }

    start () {
        super.start();

        super.point = 0;
        this.#time = 0;

        this.#playerSprite.changeChar(0, 2, 1, 1);
        for(var y = 0; y < 7; y++) {
            for(var x = 0; x < 8; x++) {
                this.#blockSprite[y][x].setPosition(x * Sprite.charWidth, (1 + y) * Sprite.charHeight);
            }
        }
        this.#startStage();
    }

    #startStage () {
        // 最後のステージをクリアしていた場合
        if(this.#currentStage >= this.#stage.length) {
            sound.play(80, 1, 80)
            return;
        }

        this.#playerSprite.changeChar(0, 2, 1, 1); // プレイヤーに正面を向かせる

        const fcx = 5; // 床のキャラ番号

        // ブロックの位置を初期化
        for(let y = 0; y < 7; y++) {
            for(let x = 0; x < 8; x++) {
                // プレイヤー以外
                if(this.#stage[this.#currentStage][y][x] !== 9) {
                    this.#blockSprite[y][x].changeChar(fcx + this.#stage[this.#currentStage][y][x] * 2, 2, 1, 1);
                }
                // プレイヤー
                else {
                    this.#playerSprite.setPosition(x * Sprite.charWidth, (y + 1) * Sprite.charHeight);
                    this.#blockSprite[y][x].changeChar(fcx, 2, 1, 1);
                }
            }
        }

        const x = this.#playerSprite.x / Sprite.charWidth;
        const y = this.#playerSprite.y / Sprite.charHeight - 1;
        this.#showMark(x, y);
    }

    // 押せる動きマークを付ける
    #showMark (x, y) {
        const a = [
            [0, 1],
            [0, -1],
            [-1, 0],
            [1, 0],
        ]
        // 動かした後の押せる動きのマークを付ける
        for(let i = 0; i < a.length; i++) {
            let movableFlag = false;
            const s = this.#blockSprite[y + a[i][1]][x + a[i][0]]; // 歩く先のブロック
            const ns = this.#blockSprite[y - a[i][1]][x - a[i][0]]; // 反対のタッチできるブロック

            // 床
            if(s.cx === 5 || s.cx === 6) {
                movableFlag = true;
            }

            // 押せるブロック
            let ss = null; // 押した先のブロック
            let sx = x + a[i][0] * 2;
            let sy = y + a[i][1] * 2;
            if(
                0 <= sx && sx < this.#stageWidth &&
                0 <= sy && sy < this.#stageHeight
            ) ss = this.#blockSprite[sy][sx];
            if((s.cx === 7 || s.cx === 8) && ss !== null && ss.cx === 5) {
                movableFlag = true;
            }

            // ゴール
            if(s.cx === 9 || s.cx === 10) {
                movableFlag = true;
            }

            // 移動可能なら反対側にマーク
            if(movableFlag) ns.changeChar(ns.cx + 1, 2, 1, 1);
        }
    }

    // 押せる動きマークを消す
    #hideMark (x, y) {
        const a = [
            [0, 1],
            [0, -1],
            [-1, 0],
            [1, 0],
        ]

        for(let i = 0; i < a.length; i++) {
            const s = this.#blockSprite[y + a[i][1]][x + a[i][0]];
            if(s.cx % 2 === 0)  s.changeChar(s.cx - 1, 2, 1, 1);
        }
    }

    #movePlayer (dx, dy) {
        const x = this.#playerSprite.x / Sprite.charWidth;
        const y = this.#playerSprite.y / Sprite.charHeight - 1;
        const nx = x + dx;
        const ny = y + dy;

        this.#hideMark(x, y);

        // プレイヤーを動かす
        this.#playerSprite.setPosition(nx * Sprite.charWidth, (ny + 1) * Sprite.charHeight);
        if(dx === 0 && dy === 1) this.#playerSprite.changeChar(0, 2, 1, 1);
        if(dx === 0 && dy === -1) this.#playerSprite.changeChar(1, 2, 1, 1);
        if(dx === -1 && dy === 0) this.#playerSprite.changeChar(2, 2, 1, 1);
        if(dx === 1 && dy === 0) this.#playerSprite.changeChar(3, 2, 1, 1);

        // ブロックを押す
        const ds = this.#blockSprite[y + dy][x + dx];
        let dss = null; // 押した先のブロック
        let sy = ny + dy;
        let sx = nx + dx;
        if(
            0 <= sy && sy < this.#stageHeight &&
            0 <= sx && sx < this.#stageWidth
        ) dss = this.#blockSprite[sy][sx];
        if(ds.cx === 7 && dss !== null && dss.cx === 5) {
            ds.changeChar(5, 2, 1, 1);
            dss.changeChar(7, 2, 1, 1);
        }

        // ゴールしたらそこでメソッドを終了
        const gs = this.#blockSprite[y + dy][x + dx];
        if(gs.cx === 9) return;

        this.#showMark(nx, ny);
    }

    poll (deltaTime, pointer) {
        const end = super.poll(deltaTime, pointer);
        if(end && this.#currentStage === this.#stage.length) return super.point;
        else if(end) return -1;

        if(this.#goal(deltaTime)) return 100;

        this.#push(pointer);
        this.#time += deltaTime;

        return 100;
    }

    #goal (deltaTime) {
        if(this.#goalWait <= 0) return false;
    
        // 次のステージへ
        this.#goalWait -= deltaTime;
        if(this.#goalWait <= 0) {
            this.#currentStage++;
            this.#startStage();
            this.#goalWait = 0;
        }

        return true;
    }

    #push (pointer) {
        if(
            pointer.down !== 1 ||
            this.#time === 0
        ) return;

        const p = this.#playerSprite;
        const px = p.x / Sprite.charWidth;
        const py = p.y / Sprite.charHeight - 1;

        // 豚を押した場合
        if(p.hitTest(pointer.x, pointer.y) && pointer.count === 0) {
            sound.play(32, 0.08, 20); // 鳴く音を再生
            return;
        }

        if(this.#goalWait !== 0 || this.#currentStage >= this.#stage.length) return;

        for(let y = 0; y < this.#stageHeight; y++) {
            for(let x = 0; x < this.#stageWidth; x++) {
                const s = this.#blockSprite[y][x];
                if(!s.hitTest(pointer.x, pointer.y)) continue; // ブロックを押していない場合は次へ

                if(s.cx % 2 === 1 && pointer.count === 0) {
                    sound.play(8, 0.05, 8); // とにかく歩けない音を再生
                    continue;
                }

                const dx = px - x;
                const dy = py - y;
                const nx = x + dx * 2;
                const ny = y + dy * 2;
                let ns = null;
                if(
                    0 <= nx && nx < this.#stageWidth &&
                    0 <= ny && ny < this.#stageHeight
                ) ns = this.#blockSprite[ny][nx];

                if(ns === null) continue; 
                if(pointer.count !== 0) continue;

                // 動ける床を押した場合
                if(ns.cx === 5 || ns.cx === 6) {
                    this.#movePlayer(dx, dy); // プレイヤーを動かす
                    sound.play(32, 0.05, 32); // ブロックを動かす音を再生
                }
                // 押せるブロックを押した場合
                else if(ns.cx === 7 || ns.cx === 8) {
                    this.#movePlayer(dx, dy); // プレイヤーを動かす
                    super.addPoint(1);
                    sound.play(44, 0.05, 44); // 歩く音を再生
                }
                // ゴールした場合
                else if(ns.cx === 9 || ns.cx === 10) {
                    this.#movePlayer(dx, dy); // プレイヤーを動かす
                    this.#playerSprite.changeChar(4, 2, 1, 1);
                    this.#goalWait = 1;
                    sound.play(44, 0.1, 68); // ゴール音を再生
                } else {
                    sound.play(8, 0.05, 8); // とにかく歩けない音を再生
                }
            }
        }
    }

    draw () {
        super.draw();
        for(var y = 0; y < 7; y++) {
            for(var x = 0; x < 8; x++) {
                this.#blockSprite[y][x].draw();
            }
        }
        this.#playerSprite.draw();
    }
}

// ブロック崩しのクラス
const Ball = class extends Game {

    #resultFlag = false;

    constructor (screen) {
        super(screen);
    }

    start () {
        super.start();
    }

    poll (deltaTime, pointer) {
        const end = super.poll(deltaTime, pointer);
        if(end && this.#resultFlag) return super.point;
        if(end) return -1;


        this.#push(pointer);

        return 100;
    }

    #push (pointer) {
        if(
            pointer.down !== 1 ||
            pointer.count !== 0
        ) return;
    }

    draw () {
        super.draw();
    }
}

// ドットイートのクラス
const Doteat = class extends Game {

    #resultFlag = false;

    constructor (screen) {
        super(screen);
    }

    start () {
        super.start();
    }

    poll (deltaTime, pointer) {
        const end = super.poll(deltaTime, pointer);
        if(end && this.#resultFlag) return super.point;
        if(end) return super.point;


        this.#push(pointer);

        return 100;
    }

    #push (pointer) {
        if(
            pointer.down !== 1 ||
            pointer.count !== 0
        ) return;
    }

    draw () {
        super.draw();
    }
}

// シューティングのクラス
const Shooting = class extends Game {
    
    #resultFlag = false;

    constructor (screen) {
        super(screen);
    }

    start () {
        super.start();
    }

    poll (deltaTime, pointer) {
        const end = super.poll(deltaTime, pointer);
        if(end && this.#resultFlag) return super.point;
        if(end) return super.point;


        this.#push(pointer);

        return 100;
    }

    #push (pointer) {
        if(
            pointer.down !== 1 ||
            pointer.count !== 0
        ) return;
    }

    draw () {
        super.draw();
    }
}

// ジャンプのクラス
const Jump = class extends Game {
    
    #resultFlag = false;

    constructor (screen) {
        super(screen);
    }

    start () {
        super.start();
    }

    poll (deltaTime, pointer) {
        const end = super.poll(deltaTime, pointer);
        if(end && this.#resultFlag) return super.point;
        if(end) return super.point;


        this.#push(pointer);

        return 100;
    }

    #push (pointer) {
        if(
            pointer.down !== 1 ||
            pointer.count !== 0
        ) return;
    }

    draw () {
        super.draw();
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
        64,
        66,
        68,
        69,
        71,
        73,
        75,
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
        this.#titleSprite.changeChar(0, 8, 8, 1);
        for(let i = 0; i < this.#menuArray.length; i++) {
            this.#menuSprite[this.#menuArray[i]].changeChar(0, 9 + i, 8, 1);
        }

        // キャラの幅と高さを取得
        const cw = Sprite.charWidth;
        const ch = Sprite.charHeight;

        // スプライトの位置を設定
        this.#titleSprite.setPosition(0.5 * cw, 3.5 * ch);
        for(let i = 0; i < this.#menuArray.length; i++) {
            this.#menuSprite[this.#menuArray[i]].setPosition(0, (i + 1) * ch);
        }

        // ポイントの初期化
        for(let i = 0; i < this.#menuArray.length; i++) {
            this.#menuPoint[this.#menuArray[i]] = 100;
            this.#menuPointSprite[this.#menuArray[i]][0].changeChar(6, 1, 1, 1);
            this.#menuPointSprite[this.#menuArray[i]][1].changeChar(6, 1, 1, 1);
            this.#menuPointSprite[this.#menuArray[i]][0].setPosition(canvas.width - cw, (i + 1) * ch);
            this.#menuPointSprite[this.#menuArray[i]][1].setPosition(canvas.height - cw * 2, (i + 1) * ch);
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
            sound.play(note, 0.05, note); // メニュー選択音を再生
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

        this.#endGame(point); // ゲームが終了したか判定
    }

    // ゲームを描画
    #drawGame () {
        if(this.#game === null) return;
        
        this.#game.draw(); // ゲームの描画
    }

    #endGame(point) {
        if(point >= 100) return; // ゲームが終了していない
        this.#updatePoint(this.#gameName, point); // ポイントを更新
        
        // 終了音
        const note = this.#menuNote[this.#gameId];
        sound.play(note - 12, 0.05, note - 12);

        this.#gameId = -1;
        this.#gameName = '';
        this.#game = null;
    }

    #updatePoint(gameName, point) {
        if(point < 0 || this.#menuPoint[gameName] <= point) return;
        this.#menuPoint[gameName] = point;
        const digit1 = point % 10;
        const digit10 = Math.floor(point / 10) % 10;
        this.#menuPointSprite[gameName][0].changeChar(6 + digit1, 0, 1, 1);
        this.#menuPointSprite[gameName][1].changeChar(6 + digit10, 0, 1, 1);
    }

    #frame (timestamp) {
        requestAnimationFrame(this.#frame.bind(this));
        const deltaTime = (timestamp - this.#prevTimestamp) / 1000;
        
        const p = this.#pointer.poll(); // ポインターの状態を取得

        this.#pushMenu(p); // メニュー項目を押したか判定
        this.#pushTitle(p); // タイトルを押したか判定

        
        this.#screen.refresh(); // 画面を黒く塗りつぶす

        this.#drawMenu(); // メニューのスプライト描画
        this.#drawTitle(); // タイトルのスプライト描画
        
        this.#pollGame(deltaTime, p); // ゲームの実行
        this.#drawGame(); // ゲームの描画

        this.#prevTimestamp = timestamp;
    }
}
const dream = new Dream(screen, pointer);
dream.start();




// キャンバスの押下
canvas.addEventListener('mousedown', (e) => {
    sound.start();
    pointer.update(e.clientX, e.clientY, 1);
});
canvas.addEventListener('touchstart', (e) => {
    sound.start();
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
});
canvas.addEventListener('touchend', (e) => {
    pointer.update(0, 0, -1);
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
body.addEventListener('contextmenu', stopEvent, { passive: false });

// 画面がブラウザに復帰した
document.addEventListener('visibilitychange', (e) => {
    if (!document.hidden) {
    }
});