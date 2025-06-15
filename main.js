'use strict';

// 要素
const body = document.body;
const canvas = document.querySelector('#canvas');


// 画面のクラス
const Screen = class {

    #canvas;
    #context;
    #image;
    static charLengthX = 8;
    static charLengthY = 8;
    #width = 0;
    #height = 0;

    constructor (canvas) {
        this.#canvas = canvas
        this.#context = this.#canvas.getContext('2d');
        this.#image = document.createElement('img');
        this.#image.src = 'sprite.png';
        this.#context.fillStyle = '#000';
        this.#width = canvas.width
        this.#height = canvas.height
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

    get width () {
        return this.#width;
    }

    get height () {
        return this.#height;
    }
}
const screen = new Screen(canvas);


// マウスとタッチのポインター情報を管理するクラス
const Pointer = class {

    #canvas = null;
    #x = 0;
    #y = 0;
    #prevX = 0;
    #prevY = 0;
    #down = -1;
    #count = -1;
    #clicked = false;

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

        // 特別にクリックのみ別に処理 TODO: クリックはルーペが出るのでやめた
        if(down === 1) {
            this.#clicked = true;
        }

        // 0が送られてくるとそのまま、1は押されているに更新、-1は押されていないに更新
        if(down !== 0 && this.#down !== down) {
            this.#count = -1;
            this.#down = down;
        }

        // 押していなかったらここで終わり
        if(this.#down !== 1) return;

        // 前回の座標を退避する
        if(this.#count !== -1) {
            this.#prevX = this.#x
            this.#prevY = this.#y
        }

        // 押している時のみ座標を更新
        if(this.#down === 1) {
            this.#x = Math.floor((x - left) / width * this.#canvas.width);
            this.#y = Math.floor((y - top) / height * this.#canvas.height);
        }

        // 押した瞬間なら前回の座標を今回の座標と同じにする
        if(this.#count === -1) {
            this.#prevX = this.#x
            this.#prevY = this.#y
        }
    }

    // ゲームのフレームから呼んでポインター情報を返す
    poll () {
        this.#count++;

        const clicked = this.#clicked
        this.#clicked = false;
        
        return {
            x: this.#x,
            y: this.#y,
            prevX: this.#prevX,
            prevY: this.#prevY,
            down: this.#down,
            count: this.#count,
            clicked: clicked,
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
    started = false;

    constructor () {
        // 音声の周波数計算
        this.#soundNote = [];
        let nextFreq = Math.pow(2, 1 / 12);
        let f = 49; // ラの音の高さ
        for (let n = 0; n < 12 * 8; n++) {
            this.#soundNote[n] = f;
            f *= nextFreq;
        }
    }

    // 音声開始
    start () {
        if(this.started) return;
        this.started = true;
        
        this.#audioContext = new AudioContext();

        //if (this.#audioContext.state === 'suspended') this.#audioContext.resume();

        this.#oscillatorNode = new OscillatorNode(this.#audioContext);
        this.#oscillatorNode.type = "square";

        this.#gainNode = this.#audioContext.createGain();

        this.#oscillatorNode.connect(this.#gainNode).connect(this.#audioContext.destination);
        this.#oscillatorNode.start(0);

        this.#gainNode.gain.setValueAtTime(0, this.#audioContext.currentTime);
    }

    // 音声再生
    play (startNote, time, endNote) {
        if(!this.started) return;
        
        this.#gainNode.gain.cancelScheduledValues(this.#audioContext.currentTime);
        this.#oscillatorNode.frequency.cancelScheduledValues(this.#audioContext.currentTime);

        this.#gainNode.gain.setValueAtTime(0, this.#audioContext.currentTime);
        this.#gainNode.gain.linearRampToValueAtTime(0.5, this.#audioContext.currentTime + 0.001);
        this.#gainNode.gain.linearRampToValueAtTime(0.5, this.#audioContext.currentTime + time - 0.001);
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
    #cx = 0;
    #cy = 0;
    #cw = 1;
    #ch = 1;
    #x = 0;
    #y = 0;
    #showFlag = true;

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

    show () {
        this.#showFlag = true;
    }

    hide () {
        this.#showFlag = false;
    }

    draw () {
        if (!this.#showFlag) return;
        this.#screen.drawChar(Math.floor(this.#cx), Math.floor(this.#cy), Math.floor(this.#cw), Math.floor(this.#ch), Math.floor(this.#x), Math.floor(this.#y));
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

    set x (n) {
        this.#x = n;
    }
    set y (n) {
        this.#y = n;
    }
    set cx (n) {
        this.#cx = n;
    }
    set cy (n) {
        this.#cy = n;
    }
    set cw (n) {
        this.#cw = n;
    }
    set ch (n) {
        this.#ch = n;
    }
    get showFlag () {
        return this.#showFlag;
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

        // 最初のスタート音
        if(Math.floor(this.#prevTime) === 1 && Math.floor(this.#time) === 2)
            sound.play(78, 1, 78);

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
            [3, 3, 3, 3, 3, 2, 3, 3,],
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
    }

    #movePlayer (dx, dy) {
        const x = this.#playerSprite.x / Sprite.charWidth;
        const y = this.#playerSprite.y / Sprite.charHeight - 1;
        const nx = x + dx;
        const ny = y + dy;

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

        // ぶたさんを押した場合
        if(p.hitTest(pointer.x, pointer.y) && pointer.count === 0) {
            sound.play(32, 0.08, 20); // 鳴く
            p.changeChar(0, 2, 1, 1);
        }

        if(this.#goalWait !== 0 || this.#currentStage >= this.#stage.length) return;

        const pcx = Math.floor(pointer.prevX / Sprite.charWidth)
        const pcy = Math.floor(pointer.prevY / Sprite.charHeight) - 1
        const ccx = Math.floor(pointer.x / Sprite.charWidth)
        const ccy = Math.floor(pointer.y / Sprite.charHeight) - 1

        if(pcx === ccx && pcy === ccy) return; // ポインターがブロック単位で動いていなければ返す
        if(pcx !== px || pcy !== py) return; // プレイヤーを押していなければ返す

        let dx = 0, dy = 0;

        if(pcx < ccx) dx = 1;
        else if(ccx < pcx) dx = -1;
        else if(pcy < ccy) dy = 1;
        else if(ccy < pcy) dy = -1;

        // 動く先のブロック
        const nx = px + dx;
        const ny = py + dy;
        let ns = null;
        if(
            0 <= nx && nx < this.#stageWidth &&
            0 <= ny && ny < this.#stageHeight
        ) ns = this.#blockSprite[ny][nx];
        if(ns === null) return;

        // 更に先のブロック
        const nnx = px + dx * 2;
        const nny = py + dy * 2;
        let nns = null;
        if(
            0 <= nnx && nnx < this.#stageWidth &&
            0 <= nny && nny < this.#stageHeight
        ) nns = this.#blockSprite[nny][nnx];

        // 動ける床を押した場合
        if(ns.cx === 5) {
            this.#movePlayer(dx, dy); // プレイヤーを動かす
            sound.play(32, 0.05, 32); // ブロックを動かす音を再生
        }
        // 押せるブロックを押した場合
        else if(ns.cx === 7 && nns !== null && nns.cx === 5) {
            this.#movePlayer(dx, dy); // プレイヤーを動かす
            super.addPoint(1);
            sound.play(44, 0.05, 44); // 歩く音を再生
        }
        // ゴールした場合
        else if(ns.cx === 9) {
            this.#movePlayer(dx, dy); // プレイヤーを動かす
            this.#playerSprite.changeChar(4, 2, 1, 1);
            this.#goalWait = 1;
            sound.play(44, 0.1, 68); // ゴール音を再生
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
    #playerSprite = null;
    #ballSprite = null;
    #goalSprite = null;
    #barSprite = new Array(3);

    constructor (screen) {
        super(screen);

        this.#playerSprite = new Sprite(screen);
        this.#ballSprite = new Sprite(screen);
        this.#goalSprite = new Sprite(screen);
        for(let i = 0; i < this.#barSprite.length; i++) {
            this.#barSprite[i] = new Sprite(screen);
        }
    }

    start () {
        super.start();

        // スプライトのキャラ設定
        this.#playerSprite.changeChar(0, 3, 1, 1);
        this.#ballSprite.changeChar(3, 3, 1, 1);
        this.#goalSprite.changeChar(4, 3, 1, 1);
        for(let i = 0; i < this.#barSprite.length; i++) {
            this.#barSprite[i].changeChar(2, 3, 1, 1);
        }

        const cw = Sprite.charWidth;
        const ch = Sprite.charHeight;

        // スプライトの位置設定
        this.#playerSprite.setPosition(7 * cw, 3.5 * ch);
        this.#ballSprite.setPosition(3.5 * cw, 3.5 * ch);
        this.#goalSprite.setPosition(0 * cw, 3.5 * ch);
        for(let i = 0; i < this.#barSprite.length; i++) {
            this.#barSprite[i].setPosition(7 * cw, (2.5 + i) * ch);
        }

        super.point = 0;
    }

    poll (deltaTime, pointer) {
        const end = super.poll(deltaTime, pointer);
        if(end && this.#resultFlag) return super.point;
        if(end) return 0; // TODO: 本来はハイスコアの0ではなく-1を返してキャンセル終了したことを表す


        this.#push(pointer);
        this.draw();

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

        // スプライトをすべて描画
        this.#playerSprite.draw();
        this.#ballSprite.draw();
        this.#goalSprite.draw();
        for(let i = 0; i < this.#barSprite.length; i++) {
            this.#barSprite[i].draw();
        }
    }
}

// ドットイートのクラス
const Doteat = class extends Game {

    #playerSprite = null; // プレイヤーのスプライト
    #stageWidth = 8;
    #stageHeight = 7;
    #stage = [
        [
            [3, 3, 3, 3, 3, 3, 3, 3,],
            [3, 2, 1, 1, 1, 1, 1, 3,],
            [3, 1, 3, 3, 3, 3, 1, 3,],
            [3, 1, 1, 0, 1, 1, 1, 3,],
            [3, 1, 3, 3, 3, 3, 1, 3,],
            [3, 1, 1, 1, 1, 1, 1, 3,],
            [3, 3, 3, 3, 3, 3, 3, 3,],
        ],
        [
            [3, 3, 3, 3, 3, 3, 3, 3,],
            [3, 3, 1, 3, 3, 1, 3, 3,],
            [3, 2, 1, 1, 1, 1, 1, 3,],
            [3, 3, 3, 1, 0, 3, 3, 3,],
            [3, 1, 1, 1, 1, 1, 2, 3,],
            [3, 3, 1, 3, 3, 1, 3, 3,],
            [3, 3, 3, 3, 3, 3, 3, 3,],
        ],
        [
            [3, 3, 3, 3, 3, 3, 3, 3,],
            [3, 2, 1, 1, 1, 2, 3, 3,],
            [3, 1, 1, 3, 1, 1, 1, 3,],
            [3, 1, 1, 1, 3, 1, 1, 3,],
            [3, 1, 3, 1, 1, 1, 2, 3,],
            [3, 1, 1, 1, 0, 3, 3, 3,],
            [3, 3, 3, 3, 3, 3, 3, 3,],
        ],
    ] // ブロックの初期状態
    #dotNum = 0; // ドットの残り数
    #currentStage = 0; // 現在のステージ
    #blockSprite = new Array(this.#stage.length);
    #catSprite = new Array(3);
    #catLength = 0; // ネコの数
    #catDelta = new Array(3); // ネコの移動方向
    #time = 0; // スタートからの時間
    #allTime = 0; // 全体の時間
    #startBeep = false; // 開始後かどうか
    #clearWait = 0; // クリア時の待ち時間
    #downTime = 0; // ネコに当たってダウンしている時間
    #resultFlag = false // 結果画面かどうか

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
        for(var i = 0; i < this.#catSprite.length; i++) {
            this.#catSprite[i] = new Sprite(screen);
        }
    }

    start () {
        super.start();

        super.point = 0;
        this.#resultFlag = false;
        this.#allTime = 0;

        // プレイヤーのスプライトの初期化
        this.#playerSprite.changeChar(0, 4, 1, 1);

        // ブロックのスプライトの初期化
        for(var y = 0; y < 7; y++) {
            for(var x = 0; x < 8; x++) {
                this.#blockSprite[y][x].setPosition(x * Sprite.charWidth, (1 + y) * Sprite.charHeight);
            }
        }

        // ネコスプライトの初期化
        for(var i = 0; i < this.#catSprite.length; i++) {
            this.#catSprite[i].changeChar(7, 4, 1, 1);
            this.#catSprite[i].setPosition(x * Sprite.charWidth, (1 + y) * Sprite.charHeight);
            this.#catDelta[i] = {};
        }

        // 最初のステージを準備
        this.#startStage();
    }

    #startStage () {
        // 最後のステージをクリアしていた場合
        if(this.#currentStage >= this.#stage.length) {
            this.#resultFlag = true;
            sound.play(71, 1, 71)
            return;
        }

        this.#playerSprite.changeChar(0, 4, 1, 1); // プレイヤーに正面を向かせる

        this.#time = -2; // 2秒後に開始
        this.#startBeep = false;
        this.#catLength = 0;
        this.#dotNum = 0;
        this.#downTime = 0;

        // ブロックの位置を初期化
        for(let y = 0; y < 7; y++) {
            for(let x = 0; x < 8; x++) {
                // ドット
                if(this.#stage[this.#currentStage][y][x] === 1) {
                    this.#blockSprite[y][x].changeChar(6, 4, 1, 1);
                    this.#dotNum++;
                } else
                // ネコ
                if(this.#stage[this.#currentStage][y][x] === 2) {
                    this.#blockSprite[y][x].changeChar(6, 4, 1, 1);
                    this.#catSprite[this.#catLength].setPosition(x * Sprite.charWidth, (y + 1) * Sprite.charHeight);
                    this.#catDelta[this.#catLength].x = 1;
                    this.#catDelta[this.#catLength].y = 0;
                    this.#catLength++;
                    this.#dotNum++;
                } else
                // 壁
                if(this.#stage[this.#currentStage][y][x] === 3) {
                    this.#blockSprite[y][x].changeChar(8, 4, 1, 1);
                } else
                // プレイヤー
                if(this.#stage[this.#currentStage][y][x] === 0) {
                    this.#playerSprite.setPosition(x * Sprite.charWidth, (y + 1) * Sprite.charHeight);
                    this.#blockSprite[y][x].changeChar(5, 4, 1, 1);
                }
            }
        }
    }

    // ネコの移動
    #moveCat (prevTime, time) {
        if(this.#time < 0) return; // まだステージ開始していなければ返す
        if(this.#clearWait > 0 || this.#resultFlag) return; // 動く時間でなければ返す
        if(Math.floor(prevTime) === Math.floor(time)) return; // 動く時間でなければ返す

        for(var i = 0; i < this.#catLength; i++) {
            const ccx = Math.floor(this.#catSprite[i].x / Sprite.charWidth); // 現在の位置
            const ccy = Math.floor(this.#catSprite[i].y / Sprite.charHeight) - 1;

            for(let j = 0; j < 3; j++) { // 3回まで連続で方向転換
                const ncx = ccx + this.#catDelta[i].x; // 仮の動き先の位置
                const ncy = ccy + this.#catDelta[i].y;
                if(this.#stage[this.#currentStage][ncy][ncx] === 3) this.#catRotate(i); // 方向変え
                else break; // 方向変えが必要ないなら抜ける
            }

            const x = this.#catSprite[i].x + this.#catDelta[i].x * Sprite.charWidth;
            const y = this.#catSprite[i].y + this.#catDelta[i].y * Sprite.charHeight;

            this.#catSprite[i].setPosition(x, y);
        }
    }

    // ネコの方向回転
    #catRotate (catId) {
        if(this.#catDelta[catId].x === 1 && this.#catDelta[catId].y === 0) {
            this.#catDelta[catId].x = 0;
            this.#catDelta[catId].y = 1;
        } else
        if(this.#catDelta[catId].x === -1 && this.#catDelta[catId].y === 0) {
            this.#catDelta[catId].x = 0;
            this.#catDelta[catId].y = -1;
        } else
        if(this.#catDelta[catId].x === 0 && this.#catDelta[catId].y === 1) {
            this.#catDelta[catId].x = -1;
            this.#catDelta[catId].y = 0;
        } else
        if(this.#catDelta[catId].x === 0 && this.#catDelta[catId].y === -1) {
            this.#catDelta[catId].x = 1;
            this.#catDelta[catId].y = 0;
        }
    }

    // プレイヤーの移動
    #movePlayer (dx, dy) {
        const x = this.#playerSprite.x / Sprite.charWidth;
        const y = this.#playerSprite.y / Sprite.charHeight - 1;
        const nx = x + dx;
        const ny = y + dy;

        // プレイヤーを動かす
        this.#playerSprite.setPosition(nx * Sprite.charWidth, (ny + 1) * Sprite.charHeight);

        // プレイヤーの向きを更新
        if(dx === 0 && dy === 1) this.#playerSprite.changeChar(0, 4, 1, 1);
        if(dx === 0 && dy === -1) this.#playerSprite.changeChar(1, 4, 1, 1);
        if(dx === -1 && dy === 0) this.#playerSprite.changeChar(2, 4, 1, 1);
        if(dx === 1 && dy === 0) this.#playerSprite.changeChar(3, 4, 1, 1);
    }

    poll (deltaTime, pointer) {
        const end = super.poll(deltaTime, pointer); // スーパークラスのメソッドを実行
        if(end && this.#currentStage === this.#stage.length) return super.point; // リザルトを見て終了
        else if(end) return -1; // キャンセル終了

        const prevTime = this.#time // 一回前の時刻
        this.#time += deltaTime; // 現在の時刻

        // タイムアタック用のタイムを加算
        if(
            this.#time >= 0 &&
            this.#clearWait <= 0 &&
            this.#currentStage < this.#stage.length
        ) this.#allTime += deltaTime;

        this.#moveCat(prevTime, this.#time) // ネコを動かす

        // 最初の開始音を鳴らす
        if(this.#time >= -1 && !this.#startBeep) {
            this.#startBeep = true;
            sound.play(83, 1, 83); // 開始音
        }

        this.#hitCat(); // ネコに当たったか
        this.#down(deltaTime); // ダウンしているか

        this.#push(pointer); // 画面を押した

        if(this.#time < 0) return 100; // まだ始まっていなければ返す

        super.point = Math.min(Math.floor(this.#allTime), 99); // ポイントに全体の経過時間を加算

        if(this.#clear(deltaTime)) return 100; // クリアしている待ち状態ならここで返す

        return 100; // ゲームを続ける
    }

    // ネコに当たってダウンしていた場合の処理
    #down (deltaTime) {
        if(this.#downTime <= 0) return; // ダウンしていなかったら返す

        this.#downTime -= deltaTime;

        // ダウンから復帰
        if(this.#downTime < 0) {
            this.#downTime = 0;
            this.#playerSprite.changeChar(0, 4, 1, 1); // ねずみの見た目を正常にする
        }
    }

    // ネコに当たった
    #hitCat () {
        if(this.#downTime > 0) return; // 既にダウンしていたら返す
        if(this.#clearWait > 0 || this.#resultFlag) return; // クリアしていたら返す

        const p = this.#playerSprite;
        const px = p.x + Sprite.charWidth / 2;
        const py = p.y + Sprite.charHeight / 2;

        // ネコに当たっていた場合は
        for(let i = 0; i < this.#catLength; i++) {
            const c = this.#catSprite[i];
            if(!c.hitTest(px, py)) continue;
            this.#downTime = 2; // ダウンしている時間を設定
            p.changeChar(4, 4, 1, 1);
            sound.play(84, 0.08, 80); // 鳴く
        }
    }

    // クリアチェック
    #clear (deltaTime) {
        if(this.#clearWait <= 0) return false; // クリアした待ち状態でなければ返す
    
        // 次のステージへ
        this.#clearWait -= deltaTime;
        if(this.#clearWait <= 0) {
            this.#currentStage++;
            this.#startStage();
            this.#clearWait = 0;
        }

        return true;
    }

    #push (pointer) {
        if(
            pointer.down !== 1
        ) return;

        const p = this.#playerSprite;
        const px = p.x / Sprite.charWidth;
        const py = p.y / Sprite.charHeight - 1;

        // ネコを押した場合
        for(let c of this.#catSprite) {
            if(!c.hitTest(pointer.x, pointer.y) || pointer.count !== 0) continue;
            sound.play(40, 0.08, 36); // 鳴く
        }

        // ねずみさんを押した場合
        const dp = (p.hitTest(pointer.x, pointer.y) && pointer.count === 0);
        if(dp && this.#downTime <= 0) { // ダウンしていない場合
            sound.play(80, 0.08, 76); // 鳴く
            p.changeChar(0, 4, 1, 1); // こちらを振り向く
        } else
        if(dp) { // ダウンしていた場合
            sound.play(84, 0.08, 80); // 高い声で鳴く
        }

        if(this.#time < 0) return; // まだ始まっていなければ返す
        if(this.#downTime > 0) return; // ダウンしていたら返す
        if(this.#clearWait !== 0 || this.#resultFlag) return; // 押せない時だったら返す

        const pcx = Math.floor(pointer.prevX / Sprite.charWidth)
        const pcy = Math.floor(pointer.prevY / Sprite.charHeight) - 1
        const ccx = Math.floor(pointer.x / Sprite.charWidth)
        const ccy = Math.floor(pointer.y / Sprite.charHeight) - 1

        if(pcx === ccx && pcy === ccy) return; // ポインターがブロック単位で動いていなければ返す
        if(pcx !== px || pcy !== py) return; // プレイヤーを押していなければ返す

        let dx = 0, dy = 0;

        if(pcx < ccx) dx = 1;
        else if(ccx < pcx) dx = -1;
        else if(pcy < ccy) dy = 1;
        else if(ccy < pcy) dy = -1;

        // 動く先のタイル
        const nx = px + dx;
        const ny = py + dy;
        let ns = null;
        if(
            0 <= nx && nx < this.#stageWidth &&
            0 <= ny && ny < this.#stageHeight
        ) ns = this.#blockSprite[ny][nx];
        if(ns === null) return;

        // 点取得済みのタイル
        if(ns.cx === 5) {
            this.#movePlayer(dx, dy); // プレイヤーを動かす
            sound.play(23, 0.05, 11); // 歩く音を再生
        } else
        // 点のタイル
        if(ns.cx === 6) {
            this.#movePlayer(dx, dy); // プレイヤーを動かす
            ns.changeChar(5, 4, 1, 1); // 点を消す
            sound.play(35, 0.05, 47); // たべる音を再生
            this.#dotNum--;
        }

        // すべてのドットをたべた場合
        if(this.#dotNum <= 0 && this.#clearWait <= 0) {
            this.#playerSprite.changeChar(9, 4, 1, 1); // クリアしたポーズ
            this.#clearWait = 1;
            sound.play(56, 0.1, 68); // ゴール音を再生
        }
    }

    draw () {
        super.draw();
        for(var y = 0; y < 7; y++) {
            for(var x = 0; x < 8; x++) {
                this.#blockSprite[y][x].draw();
            }
        }
        for(var i = 0; i < this.#catLength; i++) {
            this.#catSprite[i].draw();
        }
        this.#playerSprite.draw();
    }
}

// シューティングのクラス
const Shooting = class extends Game {
    
    #prevTime = 0;
    #time = 0;
    #startFlag = false; // 開始後かのフラグ
    #resultFlag = false; // 結果画面になったかのフラグ
    #downTime = 0; // 自機を壊されたときの残りダウン時間
    #playerSprite = null;
    #playerDeltaSprite = null; // 頭上にある三角
    #playerShotSprite = new Array(8);
    #earthSprite = new Array(8);
    #enemyDeltaSprite = new Array(18);
    #enemyShotSprite = new Array(64);
    #enemyTable = [
        [
            1, 0, 0, 0, 1, 0, 0, 0,
            1, 1, 0, 0, 0, 0, 0, 0,
            1, 0, 0, 0, 1, 0, 0, 0,
            1, 1, 0, 0, 1, 1, 0, 0,
            1, 0, 1, 0, 1, 0, 1, 0,
            1, 1, 1, 1, 0, 0, 0, 0,
        ],
        [
            0, 0, 1, 0, 0, 0, 1, 0,
            0, 0, 0, 0, 1, 1, 0, 0,
            0, 0, 1, 0, 0, 0, 1, 0,
            0, 0, 1, 1, 0, 0, 1, 1,
            0, 1, 0, 1, 0, 1, 0, 1,
            0, 0, 0, 0, 1, 1, 1, 1,
        ],
    ]

    constructor (screen) {
        super(screen);

        // スプライトを初期化
        this.#playerSprite = new Sprite(screen);
        this.#playerDeltaSprite = new Sprite(screen);
        for(let i = 0; i < this.#playerShotSprite.length; i++) this.#playerShotSprite[i] = new Sprite(screen);
        for(let i = 0; i < this.#enemyDeltaSprite.length; i++) this.#enemyDeltaSprite[i] = new Sprite(screen);
        for(let i = 0; i < this.#enemyShotSprite.length; i++) this.#enemyShotSprite[i] = new Sprite(screen);
        for(let i = 0; i < this.#earthSprite.length; i++) this.#earthSprite[i] = new Sprite(screen);
    }

    start () {
        super.start();

        // キャラと位置を初期化
        this.#playerSprite.changeChar(0, 5, 1, 1);
        this.#playerSprite.setPosition(3.5 * Sprite.charWidth, 6 * Sprite.charHeight);
        this.#playerDeltaSprite.changeChar(2, 5, 1, 1);
        this.#playerDeltaSprite.setPosition(3.5 * Sprite.charWidth, 5 * Sprite.charHeight);
        for(let i = 0; i < this.#playerShotSprite.length; i++) {
            this.#playerShotSprite[i].changeChar(3, 5, 1, 1);
            this.#playerShotSprite[i].hide();
        }
        for(let i = 0; i < this.#enemyDeltaSprite.length; i++) {
            this.#enemyDeltaSprite[i].changeChar(4, 5, 1, 1);
            this.#enemyDeltaSprite[i].setPosition(0, (i < this.#enemyDeltaSprite.length / 2? 1 : 2) * Sprite.charHeight);
            this.#enemyDeltaSprite[i].hide();
        }
        for(let i = 0; i < this.#enemyShotSprite.length; i++) {
            this.#enemyShotSprite[i].changeChar(5, 5, 1, 1);
            this.#enemyShotSprite[i].hide();
        }
        for(let i = 0; i < this.#earthSprite.length; i++) {
            this.#earthSprite[i].changeChar(6, 5, 1, 1);
            this.#earthSprite[i].setPosition(i * Sprite.charWidth, 7 * Sprite.charHeight);
        }

        // 敵数をカウント
        super.point = 0;
        for(let i = 0; i < this.#enemyTable[0].length; i++)
            if(this.#enemyTable[0][i] === 1) super.point++;
        for(let i = 0; i < this.#enemyTable[1].length; i++)
            if(this.#enemyTable[1][i] === 1) super.point++;

        this.#time = -3; // 開始までの時間
    }

    poll (deltaTime, pointer) {
        const end = super.poll(deltaTime, pointer);
        if(end && this.#resultFlag) return super.point;
        if(end) return -1;

        this.#start();
        this.#end();

        this.#startEnemy(deltaTime); // 敵機を登場させる
        this.#moveEnemy(deltaTime); // 敵機を動かす

        this.#push(pointer);

        this.#playerShot(); // 自機のショットを撃つ
        this.#movePlayerShot(deltaTime); // 自機のショットを動かす
        this.#enemyShot(); // 敵機のショットを動かす
        this.#moveEnemyShot(deltaTime); // 敵機のショットを動かす

        this.#hitPlayer(); // 自機に当てる
        this.#hitEnemy(); // 敵機に当てる

        this.#down(deltaTime);

        this.draw();

        // 開始からの時間
        this.#prevTime = this.#time;
        this.#time += deltaTime;

        return 100;
    }

    // 定期的にショットを撃つ
    #playerShot () {
        if(!this.#startFlag || this.#resultFlag) return; // 始まっていなかったり終わっていたら返す

        if(this.#downTime > 0) return; // ダウンしていれば返す

        const w = 2; // 1/2秒に一回ショットを撃つ
        if(Math.floor(this.#prevTime * w) !== Math.floor(this.#time * w)) {
            for(let i = 0; i < this.#playerShotSprite.length; i++) {
                const s = this.#playerShotSprite[i];
                if(s.showFlag) continue;
                s.setPosition(this.#playerDeltaSprite.x, this.#playerDeltaSprite.y - Sprite.charHeight);
                s.show();
                break;
            }
        }
    }

    // 各ショットを上に動かす
    #movePlayerShot (deltaTime) {
        if(!this.#startFlag || this.#resultFlag) return; // 始まっていなかったり終わっていたら返す
        for(let i = 0; i < this.#playerShotSprite.length; i++) {
            const s = this.#playerShotSprite[i];
            if(!s.showFlag) continue;
            
            s.y -= deltaTime * 64;

            if(s.y < Sprite.charHeight * 1) s.hide(); // 画面の上に行ききったら消す
        }
    }

    // 敵機がショット撃つ
    #enemyShot () {
        if(!this.#startFlag || this.#resultFlag) return; // 始まっていなかったり終わっていたら返す

        const w = 2; // 2秒に一回ショットを撃つ

        const t = Math.floor(this.#time / w);

        if(Math.floor(this.#prevTime / w) !== t) {
            const f = this.#time - Math.floor(this.#time); // 秒の小数

            for(let i = 0; i < this.#enemyDeltaSprite.length; i++) {
                const e = this.#enemyDeltaSprite[i];
                if(!e.showFlag) continue;
                for(let j = 0; j < this.#enemyShotSprite.length; j++) {
                    const s = this.#enemyShotSprite[j];
                    if(s.showFlag) continue;
                    s.setPosition(e.x, e.y + Sprite.charHeight + f);
                    s.show();
                    break;
                }
            }
        }
    }

    // 敵のショットを動かす
    #moveEnemyShot (deltaTime) {
        if(!this.#startFlag || this.#resultFlag) return; // 始まっていなかったり終わっていたら返す

        // 各ショットを下に動かす
        for(let i = 0; i < this.#enemyShotSprite.length; i++) {
            const s = this.#enemyShotSprite[i];
            if(!s.showFlag) continue;
            
            s.y += deltaTime * 32;

            if(s.y >= screen.height - Sprite.charHeight * 2) s.hide(); // 画面の下に行ききったら消す
        }
    }

    // 敵を登場させる
    #startEnemy (deltaTime) {
        if(!this.#startFlag || this.#resultFlag) return; // 始まっていなかったり終わっていたら返す
        if(Math.floor(this.#prevTime) === Math.floor(this.#time)) return; // 秒の変わり目でなければ返す

        const t = Math.floor(this.#time); // 秒

        if(t >= this.#enemyTable[0].length) return; // 敵テーブルを出し切った

        const f = this.#time - Math.floor(this.#time); // 秒の小数部分だけ取り出す
        
        // 上の段の敵
        if(this.#enemyTable[0][t] === 1) {
            for(let i = 0; i < this.#enemyDeltaSprite.length / 2; i++) {
                const s = this.#enemyDeltaSprite[i];
                if(s.showFlag) continue;

                s.x = screen.width - f;
                s.show();

                break;
            }
        }
        
        // 下の段の敵
        if(this.#enemyTable[1][t] === 1) {
            for(let i = this.#enemyDeltaSprite.length / 2; i < this.#enemyDeltaSprite.length; i++) {
                const s = this.#enemyDeltaSprite[i];
                if(s.showFlag) continue;

                s.x = f - Sprite.charWidth;
                s.show();

                break;
            }
        }
    }

    // 敵を動かす
    #moveEnemy (deltaTime) {
        if(!this.#startFlag || this.#resultFlag) return; // 始まっていなかったり終わっていたら返す

        const f = this.#time - Math.floor(this.#time); // 秒の小数部分だけ取り出す
        
        // 上の段の敵を動かす
        for(let i = 0; i < this.#enemyDeltaSprite.length / 2; i++) {
            const s = this.#enemyDeltaSprite[i];
            if(!s.showFlag) continue;
            
            s.x -= deltaTime * Sprite.charWidth;

            if(s.x < -Sprite.charWidth) s.hide(); // 画面の外に行ききったら消す
        }
        
        // 下の段の敵を動かす
        for(let i = this.#enemyDeltaSprite.length / 2; i < this.#enemyDeltaSprite.length; i++) {
            const s = this.#enemyDeltaSprite[i];
            if(!s.showFlag) continue;
            
            s.x += deltaTime * Sprite.charWidth;

            if(s.x >= screen.width) s.hide(); // 画面の外に行ききったら消す
        }
    }

    // 自機を壊されてダウンしている時間
    #down (deltaTime) {
        if(this.#downTime <= 0) return; // ダウンしていなければ返す

        this.#downTime -= deltaTime;

        // 復活
        if(this.#downTime <= 0) {
            this.#playerDeltaSprite.show();
            this.#playerSprite.changeChar(0, 5, 1, 1); // おおかみさんの顔がもどる
            this.#downTime = 0;
        }
    }

    // プレイヤーが撃たれる
    #hitPlayer () {
        if(!this.#startFlag || this.#resultFlag) return; // 始まっていなかったり終わっていたら返す
        if(this.#downTime > 0) return;

        // すべての敵とショットの組み合わせ
        const p = this.#playerDeltaSprite;

        for(let i = 0; i < this.#enemyShotSprite.length; i++) {
            const s = this.#enemyShotSprite[i];
            if(!s.showFlag) continue;
            if(!p.hitTest(s.x + Sprite.charWidth / 2, s.y + Sprite.charHeight / 2)) continue; // 当たっていなければ次
            
            p.hide(); // 自機を消す
            s.hide(); // 敵ショットを消す
            this.#playerSprite.changeChar(1, 5, 1, 1); // おおかみさんが嫌な顔をする

            this.#downTime = 3;

            sound.play(25, 0.2, 25);
        }
    }

    // 敵を撃つ
    #hitEnemy () {
        if(!this.#startFlag || this.#resultFlag) return; // 始まっていなかったり終わっていたら返す

        // すべての敵とショットの組み合わせ
        for(let i = 0; i < this.#enemyDeltaSprite.length; i++) {
            const e = this.#enemyDeltaSprite[i];
            if(!e.showFlag) continue;

            for(let i = 0; i < this.#playerShotSprite.length; i++) {
                const s = this.#playerShotSprite[i];
                if(!s.showFlag) continue;
                if(!e.hitTest(s.x + Sprite.charWidth / 2, s.y + Sprite.charHeight / 2)) continue; // 当たっていなければ次
                
                e.hide(); // 敵を消す
                s.hide(); // ショットを消す
                super.point--;

                sound.play(61, 0.05, 37);
            }
        }
    }

    // 開始
    #start () {
        if(Math.floor(this.#prevTime) === -2 && Math.floor(this.#time) === -1) sound.play(73, 1, 73); // 開始音
        if(Math.floor(this.#prevTime) === -1 && Math.floor(this.#time) === 0) this.#startFlag = true; // 開始後のフラグ
    }

    // 終了
    #end () {
        const l = this.#enemyTable[0].length + 8;
        if(
            Math.floor(this.#prevTime) === l && Math.floor(this.#time) === l + 1
        ) {
            this.#resultFlag = true; // 終了フラグを立てる

            // ショットをすべて消す
            for(let i = 0; i < this.#playerShotSprite.length; i++) {
                this.#playerShotSprite[i].hide();
            }
            for(let i = 0; i < this.#enemyShotSprite.length; i++) {
                this.#enemyShotSprite[i].hide();
            }

            if(super.point > 0) sound.play(61, 0.5, 61); // 終了音
            else sound.play(73, 1, 73); // 全部撃ったときの終了音
        }
    }

    #push (pointer) {
        if(pointer.down !== 1) return; // 画面を押していなければ返す
        if(!this.#startFlag || this.#resultFlag) return; // 始まっていなかったり終わっていたら返す

        if(pointer.x < Sprite.charWidth / 2 || canvas.width - Sprite.charWidth / 2 <= pointer.x) return; // 画面の横のフチを押していたら返す

        this.#playerSprite.x = pointer.x - Sprite.charWidth / 2;
        this.#playerDeltaSprite.x = this.#playerSprite.x;
    }

    draw () {
        super.draw();

        // スプライトをすべて描画
        this.#playerSprite.draw();
        this.#playerDeltaSprite.draw();
        for(let i = 0; i < this.#playerShotSprite.length; i++) this.#playerShotSprite[i].draw();
        for(let i = 0; i < this.#enemyDeltaSprite.length; i++) this.#enemyDeltaSprite[i].draw();
        for(let i = 0; i < this.#enemyShotSprite.length; i++) this.#enemyShotSprite[i].draw();
        for(let i = 0; i < this.#earthSprite.length; i++) this.#earthSprite[i].draw();
    }
}

// ジャンプのクラス
const Jump = class extends Game {
    
    #startFlag = false;
    #resultFlag = false;
    #playerSprite = null;
    #blockSprite = null; // コインや空白も含めた地形のスプライト
    #stageData = [
        '                                            ---                ---          ---                               ',
        '                                      ---                                -  +++                               ',
        '         ---          ---                          -   -         +   -   +         - - - -       -----        ',
        '      -          ---                    +++++                +       +             - - - -       -----        ',
        '                        +++++       ++                      +++                    - - - -       -----        ',
        '          +  ---   +++  +++++  --- ++++        +++   +   + +++++                            ---  ----- -      ',
        '++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++',
    ] // 地形データ
    #time = -3; // 開始からの時刻
    #prevTime = -3; // 前回フレームの時刻
    #vx = 0; // プレイヤーのX速度
    #vy = 0; // プレイヤーのY速度
    #ax = 2; // プレイヤーのX加速度
    #ay = 32; // プレイヤーのY加速度
    #maxVx = 2; // 最高速度X
    #maxVy = 64; // 最高速度Y
    #landing = true; // 着地しているかのフラグ
    #scrollX = 0; // 画面のスクロール位置
    #prevScrollX = 0; // 前フレームの画面のスクロール位置
    #animFrame = 0; // 歩くアニメーションのフレーム

    constructor (screen) {
        super(screen);

        // スプライトを初期化
        this.#playerSprite = new Sprite(screen);
        this.#blockSprite = new Array(7);
        for(let y = 0; y < this.#blockSprite.length; y++) {
            this.#blockSprite[y] = new Array(9);
            for(let x = 0; x < this.#blockSprite[y].length; x++) {
                this.#blockSprite[y][x] = new Sprite(screen);
            }
        }
    }

    start () {
        super.start();

        const cw = Sprite.charWidth;
        const ch = Sprite.charHeight;

        this.#playerSprite.changeChar(0, 6, 1, 1);
        this.#playerSprite.setPosition(3.5 * cw, 6 * ch);
        for(let y = 0; y < this.#blockSprite.length; y++) {
            for(let x = 0; x < this.#blockSprite[y].length; x++) {
                this.#blockSprite[y][x].changeChar(5, 6, 1, 1);
                const c = this.#stageData[y].substring(x, x + 1);
                if(c === ' ') this.#blockSprite[y][x].hide();
                if(c === '-') this.#blockSprite[y][x].cx = 6;
                this.#blockSprite[y][x].setPosition(x * cw, (y + 1) * ch);
            }
        }

        // 全コイン数を数える
        super.point = 0;
        for(let y = 0; y < this.#stageData.length; y++) {
            for(let x = 0; x < this.#stageData[y].length; x++) {
                const c = this.#stageData[y].substring(x, x + 1);
                if(c === '-') super.point++;
            }
        }

        this.#vx = 0; // プレイヤーのX速度
        this.#vy = 0; // プレイヤーのY速度
        this.#landing = true;
        this.#animFrame = 0;
    }

    poll (deltaTime, pointer) {
        const end = super.poll(deltaTime, pointer);
        if(end && this.#resultFlag) return super.point;
        if(end) return -1;

        this.#start();
        this.#end();

        this.#push(pointer);

        this.#walk(deltaTime);
        this.#hit();

        this.draw();

        this.#prevTime = this.#time;
        this.#time += deltaTime;

        return 100;
    }

    // 歩く
    #walk (deltaTime) {
        if(!this.#startFlag) return;
        if(this.#resultFlag) return;

        const cw = Sprite.charWidth;
        const ch = Sprite.charHeight;

        // 加速度を足す
        this.#vx += this.#ax * deltaTime;
        if(!this.#landing) this.#vy += this.#ay * deltaTime; // 着地していなければ落ちる

        // 前回のスクロール位置を退避
        this.#prevScrollX = this.#scrollX;

        // ゴール位置でなければX速度を位置に足す
        if(Math.floor(this.#scrollX) < this.#stageData[0].length - this.#blockSprite[0].length)
            this.#scrollX += Math.min(this.#vx, this.#maxVx) * deltaTime;

        // Y速度を位置に足す
        this.#playerSprite.y += Math.max(-this.#maxVy, Math.min(this.#vy, this.#maxVy)) * deltaTime;

        // プレイヤーの見た目
        this.#animFrame += Math.min(this.#vx, this.#maxVx) * deltaTime * 4;
        if(this.#landing) this.#playerSprite.changeChar(Math.floor(this.#animFrame % 2), 6, 1, 1); // 歩いているアニメーション
        else this.#playerSprite.changeChar(2, 6, 1, 1); // ジャンプしているポーズ

        const pi = Math.floor(this.#prevScrollX);
        const i = Math.floor(this.#scrollX); // スクロールの整数部分
        const f = this.#scrollX - i; // スクロールの小数部分

        const l = this.#blockSprite[0].length; // 画面上の横ブロック数

        // スクロールのブロック切り替わり
        if(pi < i) {
            for(let y = 0; y < this.#blockSprite.length; y++) {
                const b = this.#blockSprite[y][pi % l];
                const c = this.#stageData[y].substring(i + l - 1, i + l);
                b.show();
                if(c === ' ') b.hide();
                if(c === '+') b.cx = 5;
                if(c === '-') b.cx = 6;
            }
        }

        // スクロールでスプライトをずらす
        for(let y = 0; y < this.#blockSprite.length; y++) {
            for(let x = 0; x < this.#blockSprite[y].length; x++) {
                const b = this.#blockSprite[y][x];
                if(!b.showFlag) continue;
                
                let bi = x - i;
                while(bi < 0) bi += l;

                b.x = (bi - f) * cw;
            }
        }
    }

    // ブロックやコインとの当たり判定
    #hit() {
        if(!this.#startFlag) return;
        if(this.#resultFlag) return;

        const cw = Sprite.charWidth;
        const ch = Sprite.charHeight;

        // 全ブロックスプライトにあたり判定を行う
        this.#ax = 2; // 加速度を0にする
        this.#ay = 512; // 加速度を0にする
        const prevLanding = this.#landing;
        this.#landing = false;
        const p = this.#playerSprite;
        for(let y = 0; y < this.#blockSprite.length; y++) {
            for(let x = 0; x < this.#blockSprite[y].length; x++) {
                const b = this.#blockSprite[y][x];
                if(!b.showFlag) continue;

                // ブロックの頭上
                let head = false;
                if(b.hitTest(p.x + 4, p.y)) head = true;
                if(b.hitTest(p.x + cw - 5, p.y)) head = true;
                if(head && b.cx === 5) {
                    p.y = Math.ceil(p.y); // ブロックの下に位置に修正
                    this.#vy = 32; // 落下速度を32にする
                    continue;
                }

                // ブロックの着地判定
                let land = false;
                if(b.hitTest(p.x + 4, p.y + ch)) land = true;
                if(b.hitTest(p.x + cw - 5, p.y + ch)) land = true;
                if(land && b.cx === 5 && !this.#landing && this.#vy >= 0) {
                    this.#landing = true; // 着地フラグを立てる
                    this.#vy = 0; // 速度を0にする
                    this.#ay = 0; // 加速度を0にする
                    p.y = Math.floor(p.y / ch) * ch; // 着地した位置に修正
                    continue;
                }

                let hitRight = false;
                let hitLeft = false;
                if(b.hitTest(p.x + 1, p.y + 2)) hitLeft = true; // 左上判定
                if(b.hitTest(p.x + 1, p.y + ch - 3)) hitLeft = true; // 左下判定
                if(b.hitTest(p.x + cw - 2, p.y + 2)) hitRight = true; // 右上判定
                if(b.hitTest(p.x + cw - 2, p.y + ch - 3)) hitRight = true; // 右下判定

                // コインを取った
                if((hitLeft || hitRight) && b.cx === 6) {
                    super.point--;
                    b.hide(); // コインを消す
                    sound.play(63, 0.05, 63); // 取得音
                    continue;
                }

                // 壁にぶつかった
                if(hitRight && b.cx === 5) {
                    this.#scrollX = Math.floor(this.#scrollX) + 11 / cw; // 押し出す
                    this.#vx = 0; // 速度を0にする
                    this.#ax = 0; // 加速度を0にする
                    this.#animFrame = 0; // アニメーションフレームを0にする
                    continue;
                }
            }
        }

        // 壁にぶつかるとたぬきさんがやれやれという顔をする
        if(this.#vx === 0 && this.#landing) p.cx = 3;

        if(!prevLanding && this.#landing) sound.play(51, 0.05, 27); // 着地音
    }

    // 開始チェック
    #start () {
        if(Math.floor(this.#prevTime) === -2 && Math.floor(this.#time) === -1) sound.play(75, 1, 75); // 開始音
        if(Math.floor(this.#prevTime) === -1 && Math.floor(this.#time) === 0) this.#startFlag = true; // 開始後のフラグ
    }

    // 終了チェック
    #end () {
        if(this.#resultFlag) return;
        if(!this.#landing) return;

        const l = this.#stageData[0].length - this.#blockSprite[0].length;
        if(Math.floor(this.#prevScrollX) >= l) {
            this.#resultFlag = true; // 終了フラグを立てる

            this.#playerSprite.changeChar(4, 6, 1, 1); // たぬきさんがゴールしたポーズをする

            if(super.point > 0) sound.play(51, 1, 51); // 終了音
            else sound.play(75, 1, 75); // 全部撃ったときの終了音
        }
    }

    // 画面を押した
    #push (pointer) {
        if(!this.#startFlag) return;
        if(this.#resultFlag) return;

        // ジャンプ開始
        if(this.#landing && pointer.down === 1 && pointer.count === 0) {
            this.#landing = false; // 着地フラグをおろす
            this.#vy = -128; // 上に跳ぶ速度
            sound.play(27, 0.1, 51); // ジャンプ音
        }

        // 空中
        if(!this.#landing && pointer.down === 1) this.#ay = 160;
        if(!this.#landing && pointer.down !== 1) this.#ay = 512;
    }

    // 描画
    draw () {
        super.draw();

        this.#playerSprite.draw();
        for(let y = 0; y < this.#blockSprite.length; y++) {
            for(let x = 0; x < this.#blockSprite[y].length; x++) {
                this.#blockSprite[y][x].draw();
            }
        }
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
        52,
        54,
        56,
        57,
        59,
        61,
        63,
    ];
    #menuPointSprite = {};
    #frameContinue = false;

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

        // キャラの幅と高さを取得
        const cw = Sprite.charWidth;
        const ch = Sprite.charHeight;

        // ポイントの初期化
        for(let i = 0; i < this.#menuArray.length; i++) {
            this.#menuPoint[this.#menuArray[i]] = 100;
            this.#menuPointSprite[this.#menuArray[i]][0].changeChar(6, 1, 1, 1);
            this.#menuPointSprite[this.#menuArray[i]][1].changeChar(6, 1, 1, 1);
            this.#menuPointSprite[this.#menuArray[i]][0].setPosition(canvas.width - cw, (i + 1) * ch);
            this.#menuPointSprite[this.#menuArray[i]][1].setPosition(canvas.height - cw * 2, (i + 1) * ch);
        }

        this.#game = null;
        this.#gameId = -1;
        this.#gameName = '';
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

        if(!this.#frameContinue) {
            this.#frameContinue = true;
            requestAnimationFrame(this.#frame.bind(this));
        }
    }

    // タイトルを押したら実行
    #pushTitle (pointer) {
        if(!this.#isTitle || !pointer.clicked) return;
        this.#titleSprite.setPosition(0, 0);
        this.#isTitle = false;
    }

    // メニューを押したら実行
    #pushMenu (pointer) {
        if(
            this.#isTitle ||
            pointer.down === -1 ||
            pointer.count !== 0 ||
            this.#game !== null
        ) return;
        
        sound.start();

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
        if(this.#game === null || this.#isTitle) return;
        const point = this.#game.poll(deltaTime, pointer);

        this.#endGame(point); // ゲームが終了したか判定
    }

    // ゲームを描画
    #drawGame () {
        if(this.#game === null || this.#isTitle) return;
        
        this.#game.draw(); // ゲームの描画
    }

    #endGame(point) {
        if(point >= 100) return; // ゲームが終了していない
        this.#updatePoint(this.#gameName, point); // ポイントを更新
        
        // 終了音
        const note = this.#menuNote[this.#gameId];
        sound.play(note, 0.05, note);

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

    // タイトルかどうかを返す
    get isTitle () {
        return this.#isTitle;
    }
}
const dream = new Dream(screen, pointer);
dream.start();

// キャンバスを指で押す
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

// キャンバスから指を離す
canvas.addEventListener('mouseup', (e) => {
    pointer.update(e.clientX, e.clientY, -1);
});
canvas.addEventListener('touchend', (e) => {
    pointer.update(0, 0, -1);
});

// キャンバス以外は押しても無効
const stopEvent = (e) => {
    e.preventDefault();
    e.stopPropagation();
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
    if (document.hidden) {
        sound.started = false;
        dream.start();
    }
});