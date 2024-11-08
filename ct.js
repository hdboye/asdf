/*! Made with ct.js http://ctjs.rocks/ */

try {
    require('electron');
} catch {
    if (location.protocol === 'file:') {
        // eslint-disable-next-line no-alert
        alert('Your game won\'t work like this because\nWeb 👏 builds 👏 require 👏 a web 👏 server!\n\nConsider using a desktop build, or upload your web build to itch.io, GameJolt or your own website.\n\nIf you haven\'t created this game, please contact the developer about this issue.\n\n Also note that ct.js games do not work inside the itch app; you will need to open the game with your browser of choice.');
    }
}

const deadPool = []; // a pool of `kill`-ed copies for delaying frequent garbage collection
const copyTypeSymbol = Symbol('I am a ct.js copy');
setInterval(function cleanDeadPool() {
    deadPool.length = 0;
}, 1000 * 60);

/**
 * The ct.js library
 * @namespace
 */
const ct = {
    /**
     * A target number of frames per second. It can be interpreted as a second in timers.
     * @type {number}
     */
    speed: [60][0] || 60,
    templates: {},
    snd: {},
    stack: [],
    fps: [60][0] || 60,
    /**
     * A measure of how long a frame took time to draw, usually equal to 1 and larger on lags.
     * For example, if it is equal to 2, it means that the previous frame took twice as much time
     * compared to expected FPS rate.
     *
     * Use ct.delta to balance your movement and other calculations on different framerates by
     * multiplying it with your reference value.
     *
     * Note that `this.move()` already uses it, so there is no need to premultiply
     * `this.speed` with it.
     *
     * **A minimal example:**
     * ```js
     * this.x += this.windSpeed * ct.delta;
     * ```
     *
     * @template {number}
     */
    delta: 1,
    /**
     * A measure of how long a frame took time to draw, usually equal to 1 and larger on lags.
     * For example, if it is equal to 2, it means that the previous frame took twice as much time
     * compared to expected FPS rate.
     *
     * This is a version for UI elements, as it is not affected by time scaling, and thus works well
     * both with slow-mo effects and game pause.
     *
     * @template {number}
     */
    deltaUi: 1,
    /**
     * The camera that outputs its view to the renderer.
     * @template {Camera}
     */
    camera: null,
    /**
     * ct.js version in form of a string `X.X.X`.
     * @template {string}
     */
    version: '3.2.0',
    meta: [{"name":"Timemart","author":"hdboye","site":"hdboye.itch.io/timemart","version":"1.1.0"}][0],
    get width() {
        return ct.pixiApp.renderer.view.width;
    },
    /**
     * Resizes the drawing canvas and viewport to the given value in pixels.
     * When used with ct.fittoscreen, can be used to enlarge/shrink the viewport.
     * @param {number} value New width in pixels
     * @template {number}
     */
    set width(value) {
        ct.camera.width = ct.roomWidth = value;
        if (!ct.fittoscreen || ct.fittoscreen.mode === 'fastScale') {
            ct.pixiApp.renderer.resize(value, ct.height);
        }
        if (ct.fittoscreen) {
            ct.fittoscreen();
        }
        return value;
    },
    get height() {
        return ct.pixiApp.renderer.view.height;
    },
    /**
     * Resizes the drawing canvas and viewport to the given value in pixels.
     * When used with ct.fittoscreen, can be used to enlarge/shrink the viewport.
     * @param {number} value New height in pixels
     * @template {number}
     */
    set height(value) {
        ct.camera.height = ct.roomHeight = value;
        if (!ct.fittoscreen || ct.fittoscreen.mode === 'fastScale') {
            ct.pixiApp.renderer.resize(ct.width, value);
        }
        if (ct.fittoscreen) {
            ct.fittoscreen();
        }
        return value;
    }
};

// eslint-disable-next-line no-console
console.log(
    `%c 😺 %c ct.js game editor %c v${ct.version} %c https://ctjs.rocks/ `,
    'background: #446adb; color: #fff; padding: 0.5em 0;',
    'background: #5144db; color: #fff; padding: 0.5em 0;',
    'background: #446adb; color: #fff; padding: 0.5em 0;',
    'background: #5144db; color: #fff; padding: 0.5em 0;'
);

ct.highDensity = [true][0];
const pixiAppSettings = {
    width: [1280][0],
    height: [720][0],
    antialias: ![true][0],
    powerPreference: 'high-performance',
    sharedTicker: false,
    sharedLoader: true
};
try {
    /**
     * The PIXI.Application that runs ct.js game
     * @template {PIXI.Application}
     */
    ct.pixiApp = new PIXI.Application(pixiAppSettings);
} catch (e) {
    console.error(e);
    // eslint-disable-next-line no-console
    console.warn('[ct.js] Something bad has just happened. This is usually due to hardware problems. I\'ll try to fix them now, but if the game still doesn\'t run, try including a legacy renderer in the project\'s settings.');
    PIXI.settings.SPRITE_MAX_TEXTURES = Math.min(PIXI.settings.SPRITE_MAX_TEXTURES, 16);
    ct.pixiApp = new PIXI.Application(pixiAppSettings);
}

PIXI.settings.ROUND_PIXELS = [true][0];
ct.pixiApp.ticker.maxFPS = [60][0] || 0;
if (!ct.pixiApp.renderer.options.antialias) {
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
}
/**
 * @template PIXI.Container
 */
ct.stage = ct.pixiApp.stage;
ct.pixiApp.renderer.autoDensity = ct.highDensity;
document.getElementById('ct').appendChild(ct.pixiApp.view);

/**
 * A library of different utility functions, mainly Math-related, but not limited to them.
 * @namespace
 */
ct.u = {
    /**
     * Get the environment the game runs on.
     * @returns {string} Either 'ct.ide', or 'nw', or 'electron', or 'browser'.
     */
    getEnvironment() {
        if (window.name === 'ct.js debugger') {
            return 'ct.ide';
        }
        try {
            if (nw.require) {
                return 'nw';
            }
        } catch (oO) {
            void 0;
        }
        try {
            require('electron');
            return 'electron';
        } catch (Oo) {
            void 0;
        }
        return 'browser';
    },
    /**
     * Get the current operating system the game runs on.
     * @returns {string} One of 'windows', 'darwin' (which is MacOS), 'linux', or 'unknown'.
     */
    getOS() {
        const ua = window.navigator.userAgent;
        if (ua.indexOf('Windows') !== -1) {
            return 'windows';
        }
        if (ua.indexOf('Linux') !== -1) {
            return 'linux';
        }
        if (ua.indexOf('Mac') !== -1) {
            return 'darwin';
        }
        return 'unknown';
    },
    /**
     * Returns the length of a vector projection onto an X axis.
     * @param {number} l The length of the vector
     * @param {number} d The direction of the vector
     * @returns {number} The length of the projection
     */
    ldx(l, d) {
        return l * Math.cos(d * Math.PI / 180);
    },
    /**
     * Returns the length of a vector projection onto an Y axis.
     * @param {number} l The length of the vector
     * @param {number} d The direction of the vector
     * @returns {number} The length of the projection
     */
    ldy(l, d) {
        return l * Math.sin(d * Math.PI / 180);
    },
    /**
     * Returns the direction of a vector that points from the first point to the second one.
     * @param {number} x1 The x location of the first point
     * @param {number} y1 The y location of the first point
     * @param {number} x2 The x location of the second point
     * @param {number} y2 The y location of the second point
     * @returns {number} The angle of the resulting vector, in degrees
     */
    pdn(x1, y1, x2, y2) {
        return (Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI + 360) % 360;
    },
    // Point-point DistanCe
    /**
     * Returns the distance between two points
     * @param {number} x1 The x location of the first point
     * @param {number} y1 The y location of the first point
     * @param {number} x2 The x location of the second point
     * @param {number} y2 The y location of the second point
     * @returns {number} The distance between the two points
     */
    pdc(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    },
    /**
     * Convers degrees to radians
     * @param {number} deg The degrees to convert
     * @returns {number} The resulting radian value
     */
    degToRad(deg) {
        return deg * Math.PI / 180;
    },
    /**
     * Convers radians to degrees
     * @param {number} rad The radian value to convert
     * @returns {number} The resulting degree
     */
    radToDeg(rad) {
        return rad / Math.PI * 180;
    },
    /**
     * Rotates a vector (x; y) by `deg` around (0; 0)
     * @param {number} x The x component
     * @param {number} y The y component
     * @param {number} deg The degree to rotate by
     * @returns {PIXI.Point} A pair of new `x` and `y` parameters.
     */
    rotate(x, y, deg) {
        return ct.u.rotateRad(x, y, ct.u.degToRad(deg));
    },
    /**
     * Rotates a vector (x; y) by `rad` around (0; 0)
     * @param {number} x The x component
     * @param {number} y The y component
     * @param {number} rad The radian value to rotate around
     * @returns {PIXI.Point} A pair of new `x` and `y` parameters.
     */
    rotateRad(x, y, rad) {
        const sin = Math.sin(rad),
              cos = Math.cos(rad);
        return new PIXI.Point(
            cos * x - sin * y,
            cos * y + sin * x
        );
    },
    /**
     * Gets the most narrow angle between two vectors of given directions
     * @param {number} dir1 The direction of the first vector
     * @param {number} dir2 The direction of the second vector
     * @returns {number} The resulting angle
     */
    deltaDir(dir1, dir2) {
        dir1 = ((dir1 % 360) + 360) % 360;
        dir2 = ((dir2 % 360) + 360) % 360;
        var t = dir1,
            h = dir2,
            ta = h - t;
        if (ta > 180) {
            ta -= 360;
        }
        if (ta < -180) {
            ta += 360;
        }
        return ta;
    },
    /**
     * Returns a number in between the given range (clamps it).
     * @param {number} min The minimum value of the given number
     * @param {number} val The value to fit in the range
     * @param {number} max The maximum value of the given number
     * @returns {number} The clamped value
     */
    clamp(min, val, max) {
        return Math.max(min, Math.min(max, val));
    },
    /**
     * Linearly interpolates between two values by the apha value.
     * Can also be describing as mixing between two values with a given proportion `alpha`.
     * @param {number} a The first value to interpolate from
     * @param {number} b The second value to interpolate to
     * @param {number} alpha The mixing value
     * @returns {number} The result of the interpolation
     */
    lerp(a, b, alpha) {
        return a + (b - a) * alpha;
    },
    /**
     * Returns the position of a given value in a given range. Opposite to linear interpolation.
     * @param  {number} a The first value to interpolate from
     * @param  {number} b The second value to interpolate top
     * @param  {number} val The interpolated values
     * @return {number} The position of the value in the specified range.
     * When a <= val <= b, the result will be inside the [0;1] range.
     */
    unlerp(a, b, val) {
        return (val - a) / (b - a);
    },
    /**
     * Re-maps the given value from one number range to another.
     * @param  {number} val The value to be mapped
     * @param  {number} inMin Lower bound of the value's current range
     * @param  {number} inMax Upper bound of the value's current range
     * @param  {number} outMin Lower bound of the value's target range
     * @param  {number} outMax Upper bound of the value's target range
     * @returns {number} The mapped value.
     */
    map(val, inMin, inMax, outMin, outMax) {
        return (val - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    },
    /**
     * Translates a point from UI space to game space.
     * @param {number} x The x coordinate in UI space.
     * @param {number} y The y coordinate in UI space.
     * @returns {PIXI.Point} A pair of new `x` and `y` coordinates.
     */
    uiToGameCoord(x, y) {
        return ct.camera.uiToGameCoord(x, y);
    },
    /**
     * Translates a point from fame space to UI space.
     * @param {number} x The x coordinate in game space.
     * @param {number} y The y coordinate in game space.
     * @returns {PIXI.Point} A pair of new `x` and `y` coordinates.
     */
    gameToUiCoord(x, y) {
        return ct.camera.gameToUiCoord(x, y);
    },
    hexToPixi(hex) {
        return Number('0x' + hex.slice(1));
    },
    pixiToHex(pixi) {
        return '#' + (pixi).toString(16).padStart(6, 0);
    },
    /**
     * Tests whether a given point is inside the given rectangle
     * (it can be either a copy or an array).
     * @param {number} x The x coordinate of the point.
     * @param {number} y The y coordinate of the point.
     * @param {(Copy|Array<Number>)} arg Either a copy (it must have a rectangular shape)
     * or an array in a form of [x1, y1, x2, y2], where (x1;y1) and (x2;y2) specify
     * the two opposite corners of the rectangle.
     * @returns {boolean} `true` if the point is inside the rectangle, `false` otherwise.
     */
    prect(x, y, arg) {
        var xmin, xmax, ymin, ymax;
        if (arg.splice) {
            xmin = Math.min(arg[0], arg[2]);
            xmax = Math.max(arg[0], arg[2]);
            ymin = Math.min(arg[1], arg[3]);
            ymax = Math.max(arg[1], arg[3]);
        } else {
            xmin = arg.x - arg.shape.left * arg.scale.x;
            xmax = arg.x + arg.shape.right * arg.scale.x;
            ymin = arg.y - arg.shape.top * arg.scale.y;
            ymax = arg.y + arg.shape.bottom * arg.scale.y;
        }
        return x >= xmin && y >= ymin && x <= xmax && y <= ymax;
    },
    /**
     * Tests whether a given point is inside the given circle (it can be either a copy or an array)
     * @param {number} x The x coordinate of the point
     * @param {number} y The y coordinate of the point
     * @param {(Copy|Array<Number>)} arg Either a copy (it must have a circular shape)
     * or an array in a form of [x1, y1, r], where (x1;y1) define the center of the circle
     * and `r` defines the radius of it.
     * @returns {boolean} `true` if the point is inside the circle, `false` otherwise
     */
    pcircle(x, y, arg) {
        if (arg.splice) {
            return ct.u.pdc(x, y, arg[0], arg[1]) < arg[2];
        }
        return ct.u.pdc(0, 0, (arg.x - x) / arg.scale.x, (arg.y - y) / arg.scale.y) < arg.shape.r;
    },
    /**
     * Copies all the properties of the source object to the destination object.
     * This is **not** a deep copy. Useful for extending some settings with default values,
     * or for combining data.
     * @param {object} o1 The destination object
     * @param {object} o2 The source object
     * @param {any} [arr] An optional array of properties to copy. If not specified,
     * all the properties will be copied.
     * @returns {object} The modified destination object
     */
    ext(o1, o2, arr) {
        if (arr) {
            for (const i in arr) {
                if (o2[arr[i]]) {
                    o1[arr[i]] = o2[arr[i]];
                }
            }
        } else {
            for (const i in o2) {
                o1[i] = o2[i];
            }
        }
        return o1;
    },
    /**
     * Returns a Promise that resolves after the given time.
     * This timer is run in gameplay time scale, meaning that it is affected by time stretching.
     * @param {number} time Time to wait, in milliseconds
     * @returns {CtTimer} The timer, which you can call `.then()` to
     */
    wait(time) {
        return ct.timer.add(time);
    },
    /**
     * Returns a Promise that resolves after the given time.
     * This timer runs in UI time scale and is not sensitive to time stretching.
     * @param {number} time Time to wait, in milliseconds
     * @returns {CtTimer} The timer, which you can call `.then()` to
     */
    waitUi(time) {
        return ct.timer.addUi(time);
    },
    /**
     * Creates a new function that returns a promise, based
     * on a function with a regular (err, result) => {...} callback.
     * @param {Function} f The function that needs to be promisified
     * @see https://javascript.info/promisify
     */
    promisify(f) {
        // eslint-disable-next-line func-names
        return function (...args) {
            return new Promise((resolve, reject) => {
                const callback = function callback(err, result) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                };
                args.push(callback);
                f.call(this, ...args);
            });
        };
    },
    required(paramName, method) {
        let str = 'The parameter ';
        if (paramName) {
            str += `${paramName} `;
        }
        if (method) {
            str += `of ${method} `;
        }
        str += 'is required.';
        throw new Error(str);
    },
    numberedString(prefix, input) {
        return prefix + '_' + input.toString().padStart(2, '0');
    },
    getStringNumber(str) {
        return Number(str.split('_').pop());
    }
};
ct.u.ext(ct.u, {// make aliases
    getOs: ct.u.getOS,
    lengthDirX: ct.u.ldx,
    lengthDirY: ct.u.ldy,
    pointDirection: ct.u.pdn,
    pointDistance: ct.u.pdc,
    pointRectangle: ct.u.prect,
    pointCircle: ct.u.pcircle,
    extend: ct.u.ext
});

// eslint-disable-next-line max-lines-per-function
(() => {
    const killRecursive = copy => {
        copy.kill = true;
        if (copy.onDestroy) {
            ct.templates.onDestroy.apply(copy);
            copy.onDestroy.apply(copy);
        }
        for (const child of copy.children) {
            if (child[copyTypeSymbol]) {
                killRecursive(child);
            }
        }
        const stackIndex = ct.stack.indexOf(copy);
        if (stackIndex !== -1) {
            ct.stack.splice(stackIndex, 1);
        }
        if (copy.template) {
            const templatelistIndex = ct.templates.list[copy.template].indexOf(copy);
            if (templatelistIndex !== -1) {
                ct.templates.list[copy.template].splice(templatelistIndex, 1);
            }
        }
        deadPool.push(copy);
    };
    const manageCamera = () => {
        if (ct.camera) {
            ct.camera.update(ct.delta);
            ct.camera.manageStage();
        }
    };

    ct.loop = function loop() {
        ct.delta = ct.pixiApp.ticker.deltaMS / (1000 / (ct.pixiApp.ticker.maxFPS || 60));
        ct.deltaUi = ct.pixiApp.ticker.elapsedMS / (1000 / (ct.pixiApp.ticker.maxFPS || 60));
        ct.inputs.updateActions();
        ct.timer.updateTimers();
        ct.place.debugTraceGraphics.clear();

        ct.rooms.rootRoomOnStep.apply(ct.room);
        for (let i = 0, li = ct.stack.length; i < li; i++) {
            ct.templates.beforeStep.apply(ct.stack[i]);
            ct.stack[i].onStep.apply(ct.stack[i]);
            ct.templates.afterStep.apply(ct.stack[i]);
        }
        // There may be a number of rooms stacked on top of each other.
        // Loop through them and filter out everything that is not a room.
        for (const item of ct.stage.children) {
            if (!(item instanceof Room)) {
                continue;
            }
            ct.rooms.beforeStep.apply(item);
            item.onStep.apply(item);
            ct.rooms.afterStep.apply(item);
        }
        // copies
        for (const copy of ct.stack) {
            // eslint-disable-next-line no-underscore-dangle
            if (copy.kill && !copy._destroyed) {
                killRecursive(copy); // This will also allow a parent to eject children
                                     // to a new container before they are destroyed as well
                copy.destroy({
                    children: true
                });
            }
        }

        for (const cont of ct.stage.children) {
            cont.children.sort((a, b) =>
                ((a.depth || 0) - (b.depth || 0)) || ((a.uid || 0) - (b.uid || 0)) || 0);
        }

        manageCamera();

        for (let i = 0, li = ct.stack.length; i < li; i++) {
            ct.templates.beforeDraw.apply(ct.stack[i]);
            ct.stack[i].onDraw.apply(ct.stack[i]);
            ct.templates.afterDraw.apply(ct.stack[i]);
            ct.stack[i].xprev = ct.stack[i].x;
            ct.stack[i].yprev = ct.stack[i].y;
        }

        for (const item of ct.stage.children) {
            if (!(item instanceof Room)) {
                continue;
            }
            ct.rooms.beforeDraw.apply(item);
            item.onDraw.apply(item);
            ct.rooms.afterDraw.apply(item);
        }
        ct.rooms.rootRoomOnDraw.apply(ct.room);
        /*%afterframe%*/
        if (ct.rooms.switching) {
            ct.rooms.forceSwitch();
        }
    };
})();




/**
 * @property {number} value The current value of an action. It is always in the range from -1 to 1.
 * @property {string} name The name of the action.
 */
class CtAction {
    /**
     * This is a custom action defined in the Settings tab → Edit actions section.
     * Actions are used to abstract different input methods into one gameplay-related interface:
     * for example, joystick movement, WASD keys and arrows can be turned into two actions:
     * `MoveHorizontally` and `MoveVertically`.
     * @param {string} name The name of the new action.
     */
    constructor(name) {
        this.name = name;
        this.methodCodes = [];
        this.methodMultipliers = [];
        this.prevValue = 0;
        this.value = 0;
        return this;
    }
    /**
     * Checks whether the current action listens to a given input method.
     * This *does not* check whether this input method is supported by ct.
     *
     * @param {string} code The code to look up.
     * @returns {boolean} `true` if it exists, `false` otherwise.
     */
    methodExists(code) {
        return this.methodCodes.indexOf(code) !== -1;
    }
    /**
     * Adds a new input method to listen.
     *
     * @param {string} code The input method's code to listen to. Must be unique per action.
     * @param {number} [multiplier] An optional multiplier, e.g. to flip its value.
     * Often used with two buttons to combine them into a scalar input identical to joysticks.
     * @returns {void}
     */
    addMethod(code, multiplier) {
        if (this.methodCodes.indexOf(code) === -1) {
            this.methodCodes.push(code);
            this.methodMultipliers.push(multiplier !== void 0 ? multiplier : 1);
        } else {
            throw new Error(`[ct.inputs] An attempt to add an already added input "${code}" to an action "${name}".`);
        }
    }
    /**
     * Removes the provided input method for an action.
     *
     * @param {string} code The input method to remove.
     * @returns {void}
     */
    removeMethod(code) {
        const ind = this.methodCodes.indexOf(code);
        if (ind !== -1) {
            this.methodCodes.splice(ind, 1);
            this.methodMultipliers.splice(ind, 1);
        }
    }
    /**
     * Changes the multiplier for an input method with the provided code.
     * This method will produce a warning if one is trying to change an input method
     * that is not listened by this action.
     *
     * @param {string} code The input method's code to change
     * @param {number} multiplier The new value
     * @returns {void}
     */
    setMultiplier(code, multiplier) {
        const ind = this.methodCodes.indexOf(code);
        if (ind !== -1) {
            this.methodMultipliers[ind] = multiplier;
        } else {
            // eslint-disable-next-line no-console
            console.warning(`[ct.inputs] An attempt to change multiplier of a non-existent method "${code}" at event ${this.name}`);
            // eslint-disable-next-line no-console
            console.trace();
        }
    }
    /**
     * Recalculates the digital value of an action.
     *
     * @returns {number} A scalar value between -1 and 1.
     */
    update() {
        this.prevValue = this.value;
        this.value = 0;
        for (let i = 0, l = this.methodCodes.length; i < l; i++) {
            const rawValue = ct.inputs.registry[this.methodCodes[i]] || 0;
            this.value += rawValue * this.methodMultipliers[i];
        }
        this.value = Math.max(-1, Math.min(this.value, 1));
    }
    /**
     * Resets the state of this action, setting its value to `0`
     * and its pressed, down, released states to `false`.
     *
     * @returns {void}
     */
    reset() {
        this.prevValue = this.value = 0;
    }
    /**
     * Returns whether the action became active in the current frame,
     * either by a button just pressed or by using a scalar input.
     *
     * `true` for being pressed and `false` otherwise
     * @type {boolean}
     */
    get pressed() {
        return this.prevValue === 0 && this.value !== 0;
    }
    /**
     * Returns whether the action became inactive in the current frame,
     * either by releasing all buttons or by resting all scalar inputs.
     *
     * `true` for being released and `false` otherwise
     * @type {boolean}
     */
    get released() {
        return this.prevValue !== 0 && this.value === 0;
    }
    /**
     * Returns whether the action is active, e.g. by a pressed button
     * or a currently used scalar input.
     *
     * `true` for being active and `false` otherwise
     * @type {boolean}
     */
    get down() {
        return this.value !== 0;
    }
    /* In case you need to be hated for the rest of your life, uncomment this */
    /*
    valueOf() {
        return this.value;
    }
    */
}

/**
 * A list of custom Actions. They are defined in the Settings tab → Edit actions section.
 * @type {Object.<string,CtAction>}
 */
ct.actions = {};
/**
 * @namespace
 */
ct.inputs = {
    registry: {},
    /**
     * Adds a new action and puts it into `ct.actions`.
     *
     * @param {string} name The name of an action, as it will be used in `ct.actions`.
     * @param {Array<Object>} methods A list of input methods. This list can be changed later.
     * @returns {CtAction} The created action
     */
    addAction(name, methods) {
        if (name in ct.actions) {
            throw new Error(`[ct.inputs] An action "${name}" already exists, can't add a new one with the same name.`);
        }
        const action = new CtAction(name);
        for (const method of methods) {
            action.addMethod(method.code, method.multiplier);
        }
        ct.actions[name] = action;
        return action;
    },
    /**
     * Removes an action with a given name.
     * @param {string} name The name of an action
     * @returns {void}
     */
    removeAction(name) {
        delete ct.actions[name];
    },
    /**
     * Recalculates values for every action in a game.
     * @returns {void}
     */
    updateActions() {
        for (const i in ct.actions) {
            ct.actions[i].update();
        }
    }
};

ct.inputs.addAction('MoveX', [{"code":"keyboard.KeyD"},{"code":"keyboard.KeyA","multiplier":-1},{"code":"keyboard.ArrowRight"},{"code":"keyboard.ArrowLeft","multiplier":-1},{"code":"gamepad.Right"},{"code":"gamepad.Left","multiplier":-1},{"code":"gamepad.LStickX"},{"code":"vkeys.Vjoy1X"}]);
ct.inputs.addAction('MoveY', [{"code":"keyboard.KeyW","multiplier":-1},{"code":"keyboard.KeyS"},{"code":"keyboard.ArrowUp","multiplier":-1},{"code":"keyboard.ArrowDown"},{"code":"gamepad.Up","multiplier":-1},{"code":"gamepad.Down"},{"code":"gamepad.LStickY"},{"code":"vkeys.Vjoy1Y"}]);
ct.inputs.addAction('Jump', [{"code":"keyboard.Space"},{"code":"vkeys.Vk2"},{"code":"gamepad.Button1"}]);
ct.inputs.addAction('Sprint', [{"code":"keyboard.ShiftLeft"},{"code":"keyboard.ShiftRight"},{"code":"vkeys.Vk3"},{"code":"gamepad.Button2"}]);
ct.inputs.addAction('Crouch', [{"code":"keyboard.ControlLeft"},{"code":"keyboard.ControlRight"},{"code":"vkeys.Vk4"},{"code":"gamepad.Button3"}]);
ct.inputs.addAction('Shoot', [{"code":"pointer.Primary"},{"code":"vkeys.Vk1"},{"code":"gamepad.L2"},{"code":"gamepad.R2"}]);
ct.inputs.addAction('Secret', [{"code":"keyboard.KeyX"},{"code":"gamepad.L1"}]);
ct.inputs.addAction('Restart', [{"code":"keyboard.Enter"},{"code":"keyboard.Numpad Enter"},{"code":"gamepad.Button1"}]);
ct.inputs.addAction('Pause', [{"code":"keyboard.Escape"},{"code":"gamepad.Start"}]);
ct.inputs.addAction('Campy', [{"code":"keyboard.KeyC"}]);
ct.inputs.addAction('Click', [{"code":"pointer.Any"}]);


/**
 * @typedef IRoomMergeResult
 *
 * @property {Array<Copy>} copies
 * @property {Array<Tilemap>} tileLayers
 * @property {Array<Background>} backgrounds
 */

class Room extends PIXI.Container {
    static getNewId() {
        this.roomId++;
        return this.roomId;
    }

    constructor(template) {
        super();
        this.x = this.y = 0;
        this.uid = Room.getNewId();
        this.tileLayers = [];
        this.backgrounds = [];
        this.timer1 = this.timer2 = this.timer3 = this.timer4 = this.timer5 = this.timer6 = 0;
        if (!ct.room) {
            ct.room = ct.rooms.current = this;
        }
        if (template) {
            this.onCreate = template.onCreate;
            this.onStep = template.onStep;
            this.onDraw = template.onDraw;
            this.onLeave = template.onLeave;
            this.template = template;
            this.name = template.name;
            this.isUi = template.isUi;
            this.follow = template.follow;
            if (template.extends) {
                ct.u.ext(this, template.extends);
            }
            if (this === ct.room) {
                ct.pixiApp.renderer.backgroundColor = ct.u.hexToPixi(this.template.backgroundColor);
            }
            if (this === ct.room) {
    ct.place.tileGrid = {};
}
ct.fittoscreen();

            for (let i = 0, li = template.bgs.length; i < li; i++) {
                // Need to put additional properties like parallax here,
                // so we don't use ct.backgrounds.add
                const bg = new ct.templates.Background(
                    template.bgs[i].texture,
                    null,
                    template.bgs[i].depth,
                    template.bgs[i].exts
                );
                this.addChild(bg);
            }
            for (let i = 0, li = template.tiles.length; i < li; i++) {
                const tl = new Tilemap(template.tiles[i]);
                tl.cache();
                this.tileLayers.push(tl);
                this.addChild(tl);
            }
            for (let i = 0, li = template.objects.length; i < li; i++) {
                const copy = template.objects[i];
                const exts = copy.exts || {};
                const customProperties = copy.customProperties || {};
                ct.templates.copyIntoRoom(
                    copy.template,
                    copy.x,
                    copy.y,
                    this,
                    {
                        ...exts,
                        ...customProperties,
                        scaleX: copy.scale.x,
                        scaleY: copy.scale.y,
                        rotation: copy.rotation,
                        alpha: copy.opacity,
                        tint: copy.tint
                    }
                );
            }
        }
        return this;
    }
    get x() {
        return -this.position.x;
    }
    set x(value) {
        this.position.x = -value;
        return value;
    }
    get y() {
        return -this.position.y;
    }
    set y(value) {
        this.position.y = -value;
        return value;
    }
}
Room.roomId = 0;

(function roomsAddon() {
    /* global deadPool */
    var nextRoom;
    /**
     * @namespace
     */
    ct.rooms = {
        templates: {},
        /**
         * An object that contains arrays of currently present rooms.
         * These include the current room (`ct.room`), as well as any rooms
         * appended or prepended through `ct.rooms.append` and `ct.rooms.prepend`.
         * @type {Object.<string,Array<Room>>}
         */
        list: {},
        /**
         * Creates and adds a background to the current room, at the given depth.
         * @param {string} texture The name of the texture to use
         * @param {number} depth The depth of the new background
         * @returns {Background} The created background
         */
        addBg(texture, depth) {
            const bg = new ct.templates.Background(texture, null, depth);
            ct.room.addChild(bg);
            return bg;
        },
        /**
         * Adds a new empty tile layer to the room, at the given depth
         * @param {number} layer The depth of the layer
         * @returns {Tileset} The created tile layer
         * @deprecated Use ct.tilemaps.create instead.
         */
        addTileLayer(layer) {
            return ct.tilemaps.create(layer);
        },
        /**
         * Clears the current stage, removing all rooms with copies, tile layers, backgrounds,
         * and other potential entities.
         * @returns {void}
         */
        clear() {
            ct.stage.children = [];
            ct.stack = [];
            for (const i in ct.templates.list) {
                ct.templates.list[i] = [];
            }
            for (const i in ct.backgrounds.list) {
                ct.backgrounds.list[i] = [];
            }
            ct.rooms.list = {};
            for (const name in ct.rooms.templates) {
                ct.rooms.list[name] = [];
            }
        },
        /**
         * This method safely removes a previously appended/prepended room from the stage.
         * It will trigger "On Leave" for a room and "On Destroy" event
         * for all the copies of the removed room.
         * The room will also have `this.kill` set to `true` in its event, if it comes in handy.
         * This method cannot remove `ct.room`, the main room.
         * @param {Room} room The `room` argument must be a reference
         * to the previously created room.
         * @returns {void}
         */
        remove(room) {
            if (!(room instanceof Room)) {
                if (typeof room === 'string') {
                    throw new Error('[ct.rooms] To remove a room, you should provide a reference to it (to an object), not its name. Provided value:', room);
                }
                throw new Error('[ct.rooms] An attempt to remove a room that is not actually a room! Provided value:', room);
            }
            const ind = ct.rooms.list[room.name];
            if (ind !== -1) {
                ct.rooms.list[room.name].splice(ind, 1);
            } else {
                // eslint-disable-next-line no-console
                console.warn('[ct.rooms] Removing a room that was not found in ct.rooms.list. This is strange…');
            }
            room.kill = true;
            ct.stage.removeChild(room);
            for (const copy of room.children) {
                copy.kill = true;
            }
            room.onLeave();
            ct.rooms.onLeave.apply(room);
        },
        /*
         * Switches to the given room. Note that this transition happens at the end
         * of the frame, so the name of a new room may be overridden.
         */
        'switch'(roomName) {
            if (ct.rooms.templates[roomName]) {
                nextRoom = roomName;
                ct.rooms.switching = true;
            } else {
                console.error('[ct.rooms] The room "' + roomName + '" does not exist!');
            }
        },
        switching: false,
        /**
         * Restarts the current room.
         * @returns {void}
         */
        restart() {
            ct.rooms.switch(ct.room.name);
        },
        /**
         * Creates a new room and adds it to the stage, separating its draw stack
         * from existing ones.
         * This room is added to `ct.stage` after all the other rooms.
         * @param {string} roomName The name of the room to be appended
         * @param {object} [exts] Any additional parameters applied to the new room.
         * Useful for passing settings and data to new widgets and prefabs.
         * @returns {Room} A newly created room
         */
        append(roomName, exts) {
            if (!(roomName in ct.rooms.templates)) {
                console.error(`[ct.rooms] append failed: the room ${roomName} does not exist!`);
                return false;
            }
            const room = new Room(ct.rooms.templates[roomName]);
            if (exts) {
                ct.u.ext(room, exts);
            }
            ct.stage.addChild(room);
            room.onCreate();
            ct.rooms.onCreate.apply(room);
            ct.rooms.list[roomName].push(room);
            return room;
        },
        /**
         * Creates a new room and adds it to the stage, separating its draw stack
         * from existing ones.
         * This room is added to `ct.stage` before all the other rooms.
         * @param {string} roomName The name of the room to be prepended
         * @param {object} [exts] Any additional parameters applied to the new room.
         * Useful for passing settings and data to new widgets and prefabs.
         * @returns {Room} A newly created room
         */
        prepend(roomName, exts) {
            if (!(roomName in ct.rooms.templates)) {
                console.error(`[ct.rooms] prepend failed: the room ${roomName} does not exist!`);
                return false;
            }
            const room = new Room(ct.rooms.templates[roomName]);
            if (exts) {
                ct.u.ext(room, exts);
            }
            ct.stage.addChildAt(room, 0);
            room.onCreate();
            ct.rooms.onCreate.apply(room);
            ct.rooms.list[roomName].push(room);
            return room;
        },
        /**
         * Merges a given room into the current one. Skips room's OnCreate event.
         *
         * @param {string} roomName The name of the room that needs to be merged
         * @returns {IRoomMergeResult} Arrays of created copies, backgrounds, tile layers,
         * added to the current room (`ct.room`). Note: it does not get updated,
         * so beware of memory leaks if you keep a reference to this array for a long time!
         */
        merge(roomName) {
            if (!(roomName in ct.rooms.templates)) {
                console.error(`[ct.rooms] merge failed: the room ${roomName} does not exist!`);
                return false;
            }
            const generated = {
                copies: [],
                tileLayers: [],
                backgrounds: []
            };
            const template = ct.rooms.templates[roomName];
            const target = ct.room;
            for (const t of template.bgs) {
                const bg = new ct.templates.Background(t.texture, null, t.depth, t.extends);
                target.backgrounds.push(bg);
                target.addChild(bg);
                generated.backgrounds.push(bg);
            }
            for (const t of template.tiles) {
                const tl = new Tilemap(t);
                target.tileLayers.push(tl);
                target.addChild(tl);
                generated.tileLayers.push(tl);
                tl.cache();
            }
            for (const t of template.objects) {
                const c = ct.templates.copyIntoRoom(t.template, t.x, t.y, target, {
                    tx: t.tx || 1,
                    ty: t.ty || 1,
                    tr: t.tr || 0
                });
                generated.copies.push(c);
            }
            return generated;
        },
        forceSwitch(roomName) {
            if (nextRoom) {
                roomName = nextRoom;
            }
            if (ct.room) {
                ct.rooms.rootRoomOnLeave.apply(ct.room);
                ct.room.onLeave();
                ct.rooms.onLeave.apply(ct.room);
                ct.room = void 0;
            }
            ct.rooms.clear();
            deadPool.length = 0;
            var template = ct.rooms.templates[roomName];
            ct.roomWidth = template.width;
            ct.roomHeight = template.height;
            ct.camera = new Camera(
                ct.roomWidth / 2,
                ct.roomHeight / 2,
                ct.roomWidth,
                ct.roomHeight
            );
            if (template.cameraConstraints) {
                ct.camera.minX = template.cameraConstraints.x1;
                ct.camera.maxX = template.cameraConstraints.x2;
                ct.camera.minY = template.cameraConstraints.y1;
                ct.camera.maxY = template.cameraConstraints.y2;
            }
            ct.pixiApp.renderer.resize(template.width, template.height);
            ct.rooms.current = ct.room = new Room(template);
            ct.stage.addChild(ct.room);
            ct.rooms.rootRoomOnCreate.apply(ct.room);
            ct.room.onCreate();
            ct.rooms.onCreate.apply(ct.room);
            ct.rooms.list[roomName].push(ct.room);
            
            ct.camera.manageStage();
            ct.rooms.switching = false;
            nextRoom = void 0;
        },
        onCreate() {
            if (this === ct.room) {
    const debugTraceGraphics = new PIXI.Graphics();
    debugTraceGraphics.depth = 10000000; // Why not. Overlap everything.
    ct.room.addChild(debugTraceGraphics);
    ct.place.debugTraceGraphics = debugTraceGraphics;
}
for (const layer of this.tileLayers) {
    if (this.children.indexOf(layer) === -1) {
        continue;
    }
    ct.place.enableTilemapCollisions(layer);
}

        },
        onLeave() {
            if (this === ct.room) {
    ct.place.grid = {};
}
/* global ct */

if (!this.kill) {
    for (var tween of ct.tween.tweens) {
        tween.reject({
            info: 'Room switch',
            code: 1,
            from: 'ct.tween'
        });
    }
    ct.tween.tweens = [];
}

        },
        /**
         * The name of the starting room, as it was set in ct.IDE.
         * @type {string}
         */
        starting: 'menu'
    };
})();
/**
 * The current room
 * @type {Room}
 */
ct.room = null;

ct.rooms.beforeStep = function beforeStep() {
    var i = 0;
while (i < ct.tween.tweens.length) {
    var tween = ct.tween.tweens[i];
    if (tween.obj.kill) {
        tween.reject({
            code: 2,
            info: 'Copy is killed'
        });
        ct.tween.tweens.splice(i, 1);
        continue;
    }
    var a = tween.timer.time / tween.duration;
    if (a > 1) {
        a = 1;
    }
    for (var field in tween.fields) {
        var s = tween.starting[field],
            d = tween.fields[field] - tween.starting[field];
        tween.obj[field] = tween.curve(s, d, a);
    }
    if (a === 1) {
        tween.resolve(tween.fields);
        ct.tween.tweens.splice(i, 1);
        continue;
    }
    i++;
}
ct.pointer.updateGestures();
{
    const positionGame = ct.u.uiToGameCoord(ct.pointer.xui, ct.pointer.yui);
    ct.pointer.x = positionGame.x;
    ct.pointer.y = positionGame.y;
}

};
ct.rooms.afterStep = function afterStep() {
    
};
ct.rooms.beforeDraw = function beforeDraw() {
    
};
ct.rooms.afterDraw = function afterDraw() {
    ct.keyboard.clear();
if (ct.sound.follow && !ct.sound.follow.kill) {
    ct.sound.howler.pos(
        ct.sound.follow.x,
        ct.sound.follow.y,
        ct.sound.useDepth ? ct.sound.follow.z : 0
    );
} else if (ct.sound.manageListenerPosition) {
    ct.sound.howler.pos(ct.camera.x, ct.camera.y, ct.camera.z || 0);
}
for (const pointer of ct.pointer.down) {
    pointer.xprev = pointer.x;
    pointer.yprev = pointer.y;
    pointer.xuiprev = pointer.x;
    pointer.yuiprev = pointer.y;
}
for (const pointer of ct.pointer.hover) {
    pointer.xprev = pointer.x;
    pointer.yprev = pointer.y;
    pointer.xuiprev = pointer.x;
    pointer.yuiprev = pointer.y;
}
ct.inputs.registry['pointer.Wheel'] = 0;
ct.pointer.clearReleased();
ct.pointer.xmovement = ct.pointer.ymovement = 0;

};
ct.rooms.rootRoomOnCreate = function rootRoomOnCreate() {
    

};
ct.rooms.rootRoomOnStep = function rootRoomOnStep() {
    

};
ct.rooms.rootRoomOnDraw = function rootRoomOnDraw() {
    

};
ct.rooms.rootRoomOnLeave = function rootRoomOnLeave() {
    

};


ct.rooms.templates['Room1'] = {
    name: 'Room1',
    group: 'Room 1-10',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":192,"y":360,"opacity":1,"tint":16777215,"scale":{"x":0.2,"y":0.2},"rotation":0,"exts":{},"customProperties":{},"template":"player"},{"x":-736,"y":363,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1.01},"rotation":0,"exts":{},"customProperties":{},"template":"enemy"},{"x":1211.82608678,"y":664.73913028,"opacity":1,"tint":16777215,"scale":{"x":0.34782609,"y":0.34782609},"rotation":0,"exts":{},"customProperties":{},"template":"heartIndicator"}]'),
    bgs: JSON.parse('[{"texture":"floor","depth":-20,"exts":{"movementX":0,"movementY":0,"parallaxX":0,"parallaxY":0,"repeat":"repeat","scaleX":1.5,"scaleY":1.5,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[{"depth":500,"tiles":[{"texture":"spritsheet","frame":1,"x":1264,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":3},"tint":16777215}],"extends":{"cgroup":"ExitDoor"}},{"depth":500,"tiles":[{"texture":"time","frame":0,"x":57.3030303,"y":51.55555556,"width":495,"height":396,"opacity":1,"rotation":0,"scale":{"x":0.2020202,"y":0.2020202},"tint":16777215}],"extends":{"cgroup":"Clock"}},{"depth":2,"tiles":[{"texture":"spritsheet","frame":0,"x":28,"y":664,"width":64,"height":64,"opacity":0,"rotation":0,"scale":{"x":1.625,"y":0.95},"tint":12566463}],"extends":{"cgroup":"Secret"}},{"depth":-13,"tiles":[{"texture":"spritsheet","frame":0,"x":656,"y":32,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":400,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":-1,"y":10.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":160,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":0},{"texture":"spritsheet","frame":0,"x":656,"y":688,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":560,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":3.5},"tint":12566463}],"extends":{"cgroup":"Solid"}}]'),
    backgroundColor: '#000000',
    cameraConstraints: {"x1":1280,"y1":720,"x2":1280,"y2":720},
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room1 — core_OnRoomStart (On room start event) */
{
if(sessionTimer == 0){
    sessionTimer = 30
}
if(glitchRoom != null){
    ct.rooms.remove(glitchRoom)
    glitchRoom = null
}
if(Math.round(ct.random(10)) == 4){
    glitchRoom = ct.rooms.append('glitch');
}
var localTime = sessionTimer;
var textTimer = new PIXI.Text(localTime.toString(), ct.styles.get('MainStyle'));
textTimer.x = 96;
textTimer.y = 28;
textTimer.depth = 30; // ignore the error here, this works.
this.addChild(textTimer);
this.textLabel = new PIXI.Text('Floor 1. RUN.', ct.styles.get('MainStyle')); 
this.textLabel.x = 450;
this.textLabel.y = 330;
this.textLabel.depth = -12;
this.addChild(this.textLabel);
function startTimer(){
    var timer = ct.timer.add(1000, 'second').then(() => {
        localTime -= 1;
        sessionTimer = localTime
        textTimer.text = (localTime).toString();
        if(localTime < 4){
            ct.sound.spawn("bzzt")
        }
        if(localTime > 0){
            startTimer();
        } else {
            ct.rooms.switch("Death")
        }
    })
    .catch(e => {
        console.log('Timer killed', e);
    });
}
startTimer();
ct.transition.slideIn(200, "left")
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['RoomSecret'] = {
    name: 'RoomSecret',
    group: 'Secrets',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":192,"y":360,"opacity":1,"tint":16777215,"scale":{"x":0.2,"y":0.2},"rotation":0,"exts":{},"customProperties":{},"template":"player"},{"x":833.15,"y":320,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"vuile_sodemiet"}]'),
    bgs: JSON.parse('[{"texture":"floor","depth":-20,"exts":{"movementX":0,"movementY":0,"parallaxX":0,"parallaxY":0,"repeat":"repeat","scaleX":1.5,"scaleY":1.5,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[{"depth":500,"tiles":[],"extends":{"cgroup":"ExitDoor"}},{"depth":2,"tiles":[],"extends":{"cgroup":"Secret"}},{"depth":1,"tiles":[],"extends":{"cgroup":"Solid"}}]'),
    backgroundColor: '#000000',
    cameraConstraints: {"x1":1280,"y1":720,"x2":1280,"y2":720},
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room RoomSecret — core_OnRoomStart (On room start event) */
{
this.textLabel = new PIXI.Text('You\'re not supposed to be here.', ct.styles.get('MainStyle')); 
this.textLabel.x = 150;
this.textLabel.y = 330;
this.textLabel.depth = 5000;
this.addChild(this.textLabel);
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Death'] = {
    name: 'Death',
    group: 'ungrouped',
    width: 1280,
    height: 720,
    objects: JSON.parse('[]'),
    bgs: JSON.parse('[]'),
    tiles: JSON.parse('[{"depth":2,"tiles":[],"extends":{}},{"depth":1,"tiles":[],"extends":{}}]'),
    backgroundColor: '#000000',
    
    onStep() {
        /* room Death — core_OnActionPress (OnActionPress event) */

if (ct.actions['Restart'].pressed) {
    let value = ct.actions['Restart'].value;
    
monsterSpeedMultiplier = 1.0
playerSpeedMultiplier = 1.0
extraLife = false
time = 30
sessionTimer = time
if(!easyMode){
    inRoom = 0
}
ct.rooms.switch('Timemart')

}

    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Death — core_OnRoomStart (On room start event) */
{
ct.sound.stop('footsteps')
ct.sound.stop("glitch")
ct.sound.spawn('jumpscare')
setTimeout(()=>{
    this.textLabel = new PIXI.Text('It is not your time.', ct.styles.get('MainStyle'));
    this.textLabel.x = 360
    this.textLabel.y = 200
    this.addChild(this.textLabel);
    this.textLabel = new PIXI.Text('Press ENTER to restart.', ct.styles.get('MainStyle'));
    this.textLabel.x = 320
    this.textLabel.y = 410
    this.addChild(this.textLabel);
},4000)
}

    },
    isUi: true,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Timemart'] = {
    name: 'Timemart',
    group: 'ungrouped',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":297.64668454,"y":455.32398043,"opacity":1,"tint":16777215,"scale":{"x":0.64923471,"y":0.64923471},"rotation":0,"exts":{},"customProperties":{},"template":"monsterSpeed"},{"x":453.83083712,"y":457.89151046,"opacity":1,"tint":16777215,"scale":{"x":0.64984095,"y":0.64984095},"rotation":0,"exts":{},"customProperties":{},"template":"playerSpeed"},{"x":614.82217498,"y":450.88307591,"opacity":1,"tint":16777215,"scale":{"x":0.65411046,"y":0.65411046},"rotation":0,"exts":{},"customProperties":{},"template":"extraLife"},{"x":336,"y":240,"opacity":1,"tint":16777215,"scale":{"x":0.512,"y":0.512},"rotation":0,"exts":{},"customProperties":{},"template":"continue"}]'),
    bgs: JSON.parse('[{"texture":"shopkeeper-bg","depth":0,"exts":{"movementX":0,"movementY":0,"parallaxX":1,"parallaxY":1,"repeat":"no-repeat","scaleX":1,"scaleY":1.01,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[{"depth":2,"tiles":[{"texture":"time","frame":0,"x":397.88466483,"y":183.7937187,"width":495,"height":396,"opacity":1,"rotation":0,"scale":{"x":0.1962412,"y":0.1962412},"tint":16777215}],"extends":{}},{"depth":1,"tiles":[{"texture":"shopkeeper","frame":0,"x":744,"y":112,"width":490,"height":460,"opacity":1,"rotation":0,"scale":{"x":0.78367347,"y":0.78367347},"tint":16777215}],"extends":{}}]'),
    backgroundColor: '#000000',
    
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        /* room Timemart — core_OnRoomEnd (On room end event) */
{
sessionTimer = time
ct.sound.stop('shopkeeper')
}

    },
    onCreate() {
        /* room Timemart — core_OnRoomStart (On room start event) */
{
ct.sound.stop('footsteps')
ct.transition.slideIn(500, "left")
this.monsterSpeed = new PIXI.Text('1x', ct.styles.get('MainStyle')); 
this.monsterSpeed.x = 240
this.monsterSpeed.y = 512
this.monsterSpeed.depth = 3
this.addChild(this.monsterSpeed);
this.playerSpeed = new PIXI.Text('1x', ct.styles.get('MainStyle')); 
this.playerSpeed.x = 395
this.playerSpeed.y = 512
this.playerSpeed.depth = 3
this.addChild(this.playerSpeed);
this.extraLife = new PIXI.Text('FALSE', ct.styles.get('MainStyle')); 
this.extraLife.x = 550
this.extraLife.y = 512
this.extraLife.depth = 3
this.addChild(this.extraLife);
this.theTime = new PIXI.Text('30', ct.styles.get('MainStyle')); 
this.theTime.x = 447
this.theTime.y = 160
this.theTime.depth = 3
this.addChild(this.theTime);
this.description = new PIXI.Text('', ct.styles.get('MainStyle')); 
this.description.x = 320
this.description.y = 320
this.description.depth = 3
this.addChild(this.description);
this.extraText = new PIXI.Text('click on the icons to *switch*\n between speeds/values.', ct.styles.get('extra')); 
this.extraText.x = 302
this.extraText.y = 608
this.addChild(this.extraText);
monsterSpeedMultiplier = 1.0
playerSpeedMultiplier = 1.0
extraLife = false
time = 30

ct.sound.stop('shopkeeper')
this.shopkeeperAudio = ct.sound.spawn('shopkeeper',{loop: true});
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room2'] = {
    name: 'Room2',
    group: 'Room 1-10',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":192,"y":360,"opacity":1,"tint":16777215,"scale":{"x":0.2,"y":0.2},"rotation":0,"exts":{},"customProperties":{},"template":"player"},{"x":-736,"y":363,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1.01},"rotation":0,"exts":{},"customProperties":{},"template":"enemy"},{"x":1211.82608678,"y":664.73913028,"opacity":1,"tint":16777215,"scale":{"x":0.34782609,"y":0.34782609},"rotation":0,"exts":{},"customProperties":{},"template":"heartIndicator"}]'),
    bgs: JSON.parse('[{"texture":"floor","depth":-20,"exts":{"movementX":0,"movementY":0,"parallaxX":0,"parallaxY":0,"repeat":"repeat","scaleX":1.5,"scaleY":1.5,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[{"depth":500,"tiles":[{"texture":"spritsheet","frame":1,"x":1248,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":16777215}],"extends":{"cgroup":"ExitDoor"}},{"depth":500,"tiles":[{"texture":"time","frame":0,"x":57.3030303,"y":51.55555556,"width":495,"height":396,"opacity":1,"rotation":0,"scale":{"x":0.2020202,"y":0.2020202},"tint":16777215}],"extends":{"cgroup":"Clock"}},{"depth":2,"tiles":[{"texture":"spritsheet","frame":0,"x":28,"y":664,"width":64,"height":64,"opacity":0,"rotation":0,"scale":{"x":1.625,"y":0.95},"tint":12566463}],"extends":{"cgroup":"Secret"}},{"depth":1,"tiles":[{"texture":"spritsheet","frame":0,"x":656,"y":32,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":400,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":-1,"y":10.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":160,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":0},{"texture":"spritsheet","frame":0,"x":656,"y":688,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":480,"y":240,"width":64,"height":64,"opacity":1,"rotation":-3.141592653589793,"scale":{"x":1,"y":8.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":832,"y":432,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":7.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":576,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":4},"tint":12566463}],"extends":{"cgroup":"Solid"}}]'),
    backgroundColor: '#000000',
    cameraConstraints: {"x1":1280,"y1":720,"x2":1280,"y2":720},
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room2 — core_OnRoomStart (On room start event) */
{
if(glitchRoom != null){
        ct.rooms.remove(glitchRoom)
        glitchRoom = null
    }
if(Math.round(ct.random(10)) == 4){
    glitchRoom = ct.rooms.append('glitch');
}
if(sessionTimer == 0){
    sessionTimer = 30
}
var localTime = sessionTimer;
var textTimer = new PIXI.Text(localTime.toString(), ct.styles.get('MainStyle'));
textTimer.x = 96;
textTimer.y = 28;
textTimer.depth = 30; // ignore the error here, this works.
this.addChild(textTimer);
function startTimer(){
    var timer = ct.timer.add(1000, 'second').then(() => {
        localTime -= 1;
        sessionTimer = localTime
        textTimer.text = (localTime).toString();
        if(localTime < 4){
            ct.sound.spawn("bzzt")
        }
        if(localTime > 0){
            startTimer();
        } else {
            ct.rooms.switch("Death")
        }
    })
    .catch(e => {
        console.log('Timer killed', e);
    });
}
startTimer();
ct.transition.slideIn(200, "left")
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room3'] = {
    name: 'Room3',
    group: 'Room 1-10',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":192,"y":360,"opacity":1,"tint":16777215,"scale":{"x":0.2,"y":0.2},"rotation":0,"exts":{},"customProperties":{},"template":"player"},{"x":-736,"y":363,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1.01},"rotation":0,"exts":{},"customProperties":{},"template":"enemy"},{"x":1211.82608678,"y":664.73913028,"opacity":1,"tint":16777215,"scale":{"x":0.34782609,"y":0.34782609},"rotation":0,"exts":{},"customProperties":{},"template":"heartIndicator"}]'),
    bgs: JSON.parse('[{"texture":"floor","depth":-20,"exts":{"movementX":0,"movementY":0,"parallaxX":0,"parallaxY":0,"repeat":"repeat","scaleX":1.5,"scaleY":1.5,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[{"depth":500,"tiles":[{"texture":"spritsheet","frame":1,"x":1248,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":16777215}],"extends":{"cgroup":"ExitDoor"}},{"depth":500,"tiles":[{"texture":"time","frame":0,"x":57.3030303,"y":51.55555556,"width":495,"height":396,"opacity":1,"rotation":0,"scale":{"x":0.2020202,"y":0.2020202},"tint":16777215}],"extends":{"cgroup":"Clock"}},{"depth":2,"tiles":[{"texture":"spritsheet","frame":0,"x":28,"y":664,"width":64,"height":64,"opacity":0,"rotation":0,"scale":{"x":1.625,"y":0.95},"tint":12566463}],"extends":{"cgroup":"Secret"}},{"depth":1,"tiles":[{"texture":"spritsheet","frame":0,"x":656,"y":32,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":400,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":-1,"y":10.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":160,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":0},{"texture":"spritsheet","frame":0,"x":656,"y":688,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":608,"y":240,"width":64,"height":64,"opacity":1,"rotation":-1.5707963267948966,"scale":{"x":1,"y":8.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":864,"y":368,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":4.95},"tint":12566463},{"texture":"spritsheet","frame":0,"x":608,"y":496,"width":64,"height":64,"opacity":1,"rotation":-1.5707963267948966,"scale":{"x":1,"y":8.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":576,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":4},"tint":12566463}],"extends":{"cgroup":"Solid"}}]'),
    backgroundColor: '#000000',
    cameraConstraints: {"x1":1280,"y1":720,"x2":1280,"y2":720},
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room3 — core_OnRoomStart (On room start event) */
{
if(glitchRoom != null){
        ct.rooms.remove(glitchRoom)
        glitchRoom = null
    }
if(Math.round(ct.random(10)) == 4){
    glitchRoom = ct.rooms.append('glitch');
}
if(sessionTimer == 0){
    sessionTimer = 30
}
var localTime = sessionTimer;
var textTimer = new PIXI.Text(localTime.toString(), ct.styles.get('MainStyle'));
textTimer.x = 96;
textTimer.y = 28;
textTimer.depth = 30; // ignore the error here, this works.
this.addChild(textTimer);
function startTimer(){
    var timer = ct.timer.add(1000, 'second').then(() => {
        localTime -= 1;
        sessionTimer = localTime
        textTimer.text = (localTime).toString();
        if(localTime < 4){
            ct.sound.spawn("bzzt")
        }
        if(localTime > 0){
            startTimer();
        } else {
            ct.rooms.switch("Death")
        }
    })
    .catch(e => {
        console.log('Timer killed', e);
    });
}
startTimer();
ct.transition.slideIn(200, "left")
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room4'] = {
    name: 'Room4',
    group: 'Room 1-10',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":192,"y":360,"opacity":1,"tint":16777215,"scale":{"x":0.2,"y":0.2},"rotation":0,"exts":{},"customProperties":{},"template":"player"},{"x":-736,"y":363,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1.01},"rotation":0,"exts":{},"customProperties":{},"template":"enemy"},{"x":1211.82608678,"y":664.73913028,"opacity":1,"tint":16777215,"scale":{"x":0.34782609,"y":0.34782609},"rotation":0,"exts":{},"customProperties":{},"template":"heartIndicator"},{"x":1083.50692351,"y":593.1117187,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":-1.5707963267948966,"exts":{},"customProperties":{"newProperty1":""},"template":"blueButton"},{"x":640,"y":224,"opacity":1,"tint":16777215,"scale":{"x":0.125,"y":0.5625},"rotation":0,"exts":{},"customProperties":{},"template":"bluewall"}]'),
    bgs: JSON.parse('[{"texture":"floor","depth":-20,"exts":{"movementX":0,"movementY":0,"parallaxX":0,"parallaxY":0,"repeat":"repeat","scaleX":1.5,"scaleY":1.5,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[{"depth":500,"tiles":[{"texture":"spritsheet","frame":1,"x":1248,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":16777215}],"extends":{"cgroup":"ExitDoor"}},{"depth":500,"tiles":[{"texture":"time","frame":0,"x":57.3030303,"y":51.55555556,"width":495,"height":396,"opacity":1,"rotation":0,"scale":{"x":0.2020202,"y":0.2020202},"tint":16777215}],"extends":{"cgroup":"Clock"}},{"depth":2,"tiles":[{"texture":"spritsheet","frame":0,"x":28,"y":664,"width":64,"height":64,"opacity":0,"rotation":0,"scale":{"x":1.625,"y":0.95},"tint":12566463}],"extends":{"cgroup":"Secret"}},{"depth":1,"tiles":[{"texture":"spritsheet","frame":0,"x":656,"y":32,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":400,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":-1,"y":10.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":160,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":0},{"texture":"spritsheet","frame":0,"x":656,"y":688,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":944,"y":496,"width":64,"height":64,"opacity":1,"rotation":-1.5707963267948966,"scale":{"x":1,"y":9.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1184,"y":608,"width":64,"height":64,"opacity":1,"rotation":-1.5707963267948966,"scale":{"x":4,"y":2.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":944,"y":208,"width":64,"height":64,"opacity":1,"rotation":-1.5707963267948966,"scale":{"x":1,"y":9.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":576,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":4},"tint":12566463}],"extends":{"cgroup":"Solid"}}]'),
    backgroundColor: '#000000',
    cameraConstraints: {"x1":1280,"y1":720,"x2":1280,"y2":720},
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room4 — core_OnRoomStart (On room start event) */
{
redPressed = false
bluePressed = false
greenPressed = false
if(glitchRoom != null){
        ct.rooms.remove(glitchRoom)
        glitchRoom = null
    }
if(Math.round(ct.random(10)) == 4){
    glitchRoom = ct.rooms.append('glitch');
}
if(sessionTimer == 0){
    sessionTimer = 30
}
var localTime = sessionTimer;
var textTimer = new PIXI.Text(localTime.toString(), ct.styles.get('MainStyle'));
textTimer.x = 96;
textTimer.y = 28;
textTimer.depth = 30; // ignore the error here, this works.
this.addChild(textTimer);
function startTimer(){
    var timer = ct.timer.add(1000, 'second').then(() => {
        localTime -= 1;
        sessionTimer = localTime
        textTimer.text = (localTime).toString();
        if(localTime < 4){
            ct.sound.spawn("bzzt")
        }
        if(localTime > 0){
            startTimer();
        } else {
            ct.rooms.switch("Death")
        }
    })
    .catch(e => {
        console.log('Timer killed', e);
    });
}
startTimer();
ct.transition.slideIn(200, "left")
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room5'] = {
    name: 'Room5',
    group: 'Room 1-10',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":192,"y":360,"opacity":1,"tint":16777215,"scale":{"x":0.2,"y":0.2},"rotation":0,"exts":{},"customProperties":{},"template":"player"},{"x":-736,"y":363,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1.01},"rotation":0,"exts":{},"customProperties":{},"template":"enemy"},{"x":1211.82608678,"y":664.73913028,"opacity":1,"tint":16777215,"scale":{"x":0.34782609,"y":0.34782609},"rotation":0,"exts":{},"customProperties":{},"template":"heartIndicator"},{"x":251.75786235,"y":80.86829526,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":-3.141592653589793,"exts":{},"customProperties":{"newProperty1":""},"template":"blueButton"},{"x":384,"y":32,"opacity":1,"tint":16777215,"scale":{"x":0.125,"y":1.3125},"rotation":0,"exts":{},"customProperties":{"newProperty1":"","newProperty2":""},"template":"bluewall"},{"x":592,"y":640,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":0,"exts":{},"customProperties":{},"template":"redButton"},{"x":704,"y":32,"opacity":1,"tint":16777215,"scale":{"x":0.125,"y":1.25},"rotation":0,"exts":{},"customProperties":{},"template":"redwall"},{"x":1024,"y":32,"opacity":1,"tint":16777215,"scale":{"x":0.125,"y":1.25},"rotation":0,"exts":{},"customProperties":{},"template":"greenwall"},{"x":896,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":3.141592653589793,"exts":{},"customProperties":{},"template":"greenButton"}]'),
    bgs: JSON.parse('[{"texture":"floor","depth":-20,"exts":{"movementX":0,"movementY":0,"parallaxX":0,"parallaxY":0,"repeat":"repeat","scaleX":1.5,"scaleY":1.5,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[{"depth":500,"tiles":[{"texture":"spritsheet","frame":1,"x":1248,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":16777215}],"extends":{"cgroup":"ExitDoor"}},{"depth":500,"tiles":[{"texture":"time","frame":0,"x":57.3030303,"y":51.55555556,"width":495,"height":396,"opacity":1,"rotation":0,"scale":{"x":0.2020202,"y":0.2020202},"tint":16777215}],"extends":{"cgroup":"Clock"}},{"depth":2,"tiles":[{"texture":"spritsheet","frame":0,"x":28,"y":664,"width":64,"height":64,"opacity":0,"rotation":0,"scale":{"x":1.625,"y":0.95},"tint":12566463}],"extends":{"cgroup":"Secret"}},{"depth":1,"tiles":[{"texture":"spritsheet","frame":0,"x":656,"y":32,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":400,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":-1,"y":10.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":160,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":0},{"texture":"spritsheet","frame":0,"x":656,"y":688,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":608,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":5},"tint":12566463}],"extends":{"cgroup":"Solid"}}]'),
    backgroundColor: '#000000',
    cameraConstraints: {"x1":1280,"y1":720,"x2":1280,"y2":720},
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room5 — core_OnRoomStart (On room start event) */
{
redPressed = false
bluePressed = false
greenPressed = false
if(sessionTimer == 0){
    sessionTimer = 30
}
if(glitchRoom != null){
        ct.rooms.remove(glitchRoom)
        glitchRoom = null
    }
if(Math.round(ct.random(10)) == 4){
    glitchRoom = ct.rooms.append('glitch');
}
var localTime = sessionTimer;
var textTimer = new PIXI.Text(localTime.toString(), ct.styles.get('MainStyle'));
textTimer.x = 96;
textTimer.y = 28;
textTimer.depth = 30; // ignore the error here, this works.
this.addChild(textTimer);
function startTimer(){
    var timer = ct.timer.add(1000, 'second').then(() => {
        localTime -= 1;
        sessionTimer = localTime
        textTimer.text = (localTime).toString();
        if(localTime < 4){
            ct.sound.spawn("bzzt")
        }
        if(localTime > 0){
            startTimer();
        } else {
            ct.rooms.switch("Death")
        }
    })
    .catch(e => {
        console.log('Timer killed', e);
    });
}
startTimer();
ct.transition.slideIn(200, "left")
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room6'] = {
    name: 'Room6',
    group: 'Room 1-10',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":192,"y":360,"opacity":1,"tint":16777215,"scale":{"x":0.2,"y":0.2},"rotation":0,"exts":{},"customProperties":{},"template":"player"},{"x":-736,"y":363,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1.01},"rotation":0,"exts":{},"customProperties":{},"template":"enemy"},{"x":1211.82608678,"y":664.73913028,"opacity":1,"tint":16777215,"scale":{"x":0.34782609,"y":0.34782609},"rotation":0,"exts":{},"customProperties":{},"template":"heartIndicator"},{"x":1211.51029929,"y":529.11932583,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":-1.5707963267948966,"exts":{},"customProperties":{"newProperty1":""},"template":"blueButton"},{"x":512,"y":32,"opacity":1,"tint":16777215,"scale":{"x":0.125,"y":0.4375},"rotation":0,"exts":{},"customProperties":{"newProperty1":"","newProperty2":""},"template":"bluewall"},{"x":304.25407466,"y":143.74896331,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":1.5707963267948966,"exts":{},"customProperties":{},"template":"redButton"},{"x":1152,"y":224,"opacity":1,"tint":16777215,"scale":{"x":0.125,"y":0.5},"rotation":0,"exts":{},"customProperties":{},"template":"redwall"}]'),
    bgs: JSON.parse('[{"texture":"floor","depth":-20,"exts":{"movementX":0,"movementY":0,"parallaxX":0,"parallaxY":0,"repeat":"repeat","scaleX":1.5,"scaleY":1.5,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[{"depth":500,"tiles":[{"texture":"spritsheet","frame":1,"x":1248,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":16777215}],"extends":{"cgroup":"ExitDoor"}},{"depth":500,"tiles":[{"texture":"time","frame":0,"x":57.3030303,"y":51.55555556,"width":495,"height":396,"opacity":1,"rotation":0,"scale":{"x":0.2020202,"y":0.2020202},"tint":16777215}],"extends":{"cgroup":"Clock"}},{"depth":2,"tiles":[{"texture":"spritsheet","frame":0,"x":28,"y":664,"width":64,"height":64,"opacity":0,"rotation":0,"scale":{"x":1.625,"y":0.95},"tint":12566463}],"extends":{"cgroup":"Secret"}},{"depth":1,"tiles":[{"texture":"spritsheet","frame":0,"x":656,"y":32,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":400,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":-1,"y":10.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":160,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":0},{"texture":"spritsheet","frame":0,"x":656,"y":688,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":144,"y":160,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":4.5,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":368,"y":240,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":4.5,"y":0.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":576,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":4},"tint":12566463}],"extends":{"cgroup":"Solid"}}]'),
    backgroundColor: '#000000',
    cameraConstraints: {"x1":1280,"y1":720,"x2":1280,"y2":720},
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room6 — core_OnRoomStart (On room start event) */
{
redPressed = false
bluePressed = false
greenPressed = false
if(sessionTimer == 0){
    sessionTimer = 30
}
if(glitchRoom != null){
        ct.rooms.remove(glitchRoom)
        glitchRoom = null
    }
if(Math.round(ct.random(10)) == 4){
    glitchRoom = ct.rooms.append('glitch');
}
var localTime = sessionTimer;
var textTimer = new PIXI.Text(localTime.toString(), ct.styles.get('MainStyle'));
textTimer.x = 96;
textTimer.y = 28;
textTimer.depth = 30; // ignore the error here, this works.
this.addChild(textTimer);
this.textLabel = new PIXI.Text('Floor 2. RUN.', ct.styles.get('MainStyle')); 
this.textLabel.x = 450;
this.textLabel.y = 330;
this.textLabel.depth = -12;
this.addChild(this.textLabel);
function startTimer(){
    var timer = ct.timer.add(1000, 'second').then(() => {
        localTime -= 1;
        sessionTimer = localTime
        textTimer.text = (localTime).toString();
        if(localTime < 4){
            ct.sound.spawn("bzzt")
        }
        if(localTime > 0){
            startTimer();
        } else {
            ct.rooms.switch("Death")
        }
    })
    .catch(e => {
        console.log('Timer killed', e);
    });
}
startTimer();
ct.transition.slideIn(200, "left")
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room7'] = {
    name: 'Room7',
    group: 'Room 1-10',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":192,"y":360,"opacity":1,"tint":16777215,"scale":{"x":0.19,"y":0.19},"rotation":0,"exts":{},"customProperties":{},"template":"player"},{"x":-736,"y":363,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1.01},"rotation":0,"exts":{},"customProperties":{},"template":"enemy"},{"x":1211.82608678,"y":664.73913028,"opacity":1,"tint":16777215,"scale":{"x":0.34782609,"y":0.34782609},"rotation":0,"exts":{},"customProperties":{},"template":"heartIndicator"},{"x":187.75777466,"y":80.8616603,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":-3.141592653589793,"exts":{},"customProperties":{"newProperty1":""},"template":"blueButton"},{"x":320,"y":32,"opacity":1,"tint":16777215,"scale":{"x":0.125,"y":1.3125},"rotation":0,"exts":{},"customProperties":{"newProperty1":"","newProperty2":""},"template":"bluewall"},{"x":464,"y":640,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":0,"exts":{},"customProperties":{},"template":"redButton"},{"x":1184,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.0625,"y":1.25},"rotation":0,"exts":{},"customProperties":{},"template":"redwall"},{"x":800,"y":-64,"opacity":1,"tint":16777215,"scale":{"x":0.125,"y":1.5},"rotation":0,"exts":{},"customProperties":{},"template":"greenwall"},{"x":704,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":3.141592653589793,"exts":{},"customProperties":{},"template":"greenButton"},{"x":608,"y":160,"opacity":1,"tint":16777215,"scale":{"x":0.375,"y":0.0625},"rotation":0,"exts":{},"customProperties":{},"template":"redwall"}]'),
    bgs: JSON.parse('[{"texture":"floor","depth":-20,"exts":{"movementX":0,"movementY":0,"parallaxX":0,"parallaxY":0,"repeat":"repeat","scaleX":1.5,"scaleY":1.5,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[{"depth":500,"tiles":[{"texture":"spritsheet","frame":1,"x":1248,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":16777215}],"extends":{"cgroup":"ExitDoor"}},{"depth":500,"tiles":[{"texture":"time","frame":0,"x":57.3030303,"y":51.55555556,"width":495,"height":396,"opacity":1,"rotation":0,"scale":{"x":0.2020202,"y":0.2020202},"tint":16777215}],"extends":{"cgroup":"Clock"}},{"depth":2,"tiles":[{"texture":"spritsheet","frame":0,"x":28,"y":664,"width":64,"height":64,"opacity":0,"rotation":0,"scale":{"x":1.625,"y":0.95},"tint":12566463}],"extends":{"cgroup":"Secret"}},{"depth":1,"tiles":[{"texture":"spritsheet","frame":0,"x":656,"y":32,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":400,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":-1,"y":10.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":160,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":0},{"texture":"spritsheet","frame":0,"x":656,"y":688,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":576,"y":128,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":2},"tint":12566463},{"texture":"spritsheet","frame":0,"x":592,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":6.5,"y":0.8888},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":576,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":4},"tint":12566463}],"extends":{"cgroup":"Solid"}}]'),
    backgroundColor: '#000000',
    cameraConstraints: {"x1":1280,"y1":720,"x2":1280,"y2":720},
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room7 — core_OnRoomStart (On room start event) */
{
redPressed = false
bluePressed = false
greenPressed = false
if(sessionTimer == 0){
    sessionTimer = 30
}
if(glitchRoom != null){
        ct.rooms.remove(glitchRoom)
        glitchRoom = null
    }
if(Math.round(ct.random(10)) == 4){
    glitchRoom = ct.rooms.append('glitch');
}
var localTime = sessionTimer;
var textTimer = new PIXI.Text(localTime.toString(), ct.styles.get('MainStyle'));
textTimer.x = 96;
textTimer.y = 28;
textTimer.depth = 30; // ignore the error here, this works.
this.addChild(textTimer);
function startTimer(){
    var timer = ct.timer.add(1000, 'second').then(() => {
        localTime -= 1;
        sessionTimer = localTime
        textTimer.text = (localTime).toString();
        if(localTime < 4){
            ct.sound.spawn("bzzt")
        }
        if(localTime > 0){
            startTimer();
        } else {
            ct.rooms.switch("Death")
        }
    })
    .catch(e => {
        console.log('Timer killed', e);
    });
}
startTimer();
ct.transition.slideIn(200, "left")
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room8'] = {
    name: 'Room8',
    group: 'Room 1-10',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":192,"y":360,"opacity":1,"tint":16777215,"scale":{"x":0.19,"y":0.19},"rotation":0,"exts":{},"customProperties":{},"template":"player"},{"x":-736,"y":363,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1.01},"rotation":0,"exts":{},"customProperties":{},"template":"enemy"},{"x":1211.82608678,"y":664.73913028,"opacity":1,"tint":16777215,"scale":{"x":0.34782609,"y":0.34782609},"rotation":0,"exts":{},"customProperties":{},"template":"heartIndicator"},{"x":827.75777466,"y":528.8616603,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":3.141592653589793,"exts":{},"customProperties":{"newProperty1":""},"template":"blueButton"},{"x":928,"y":288,"opacity":1,"tint":16777215,"scale":{"x":0.0625,"y":0.375},"rotation":0,"exts":{},"customProperties":{"newProperty1":"","newProperty2":""},"template":"bluewall"},{"x":828,"y":440,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":0,"exts":{},"customProperties":{},"template":"redButton"},{"x":928,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.0625,"y":0.4375},"rotation":0,"exts":{},"customProperties":{},"template":"redwall"},{"x":928,"y":480,"opacity":1,"tint":16777215,"scale":{"x":0.0625,"y":0.4375},"rotation":0,"exts":{},"customProperties":{},"template":"greenwall"},{"x":832,"y":72,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":3.141592653589793,"exts":{},"customProperties":{},"template":"greenButton"}]'),
    bgs: JSON.parse('[{"texture":"floor","depth":-20,"exts":{"movementX":0,"movementY":0,"parallaxX":0,"parallaxY":0,"repeat":"repeat","scaleX":1.5,"scaleY":1.5,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[{"depth":500,"tiles":[{"texture":"spritsheet","frame":1,"x":1248,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":16777215}],"extends":{"cgroup":"ExitDoor"}},{"depth":500,"tiles":[{"texture":"time","frame":0,"x":57.3030303,"y":51.55555556,"width":495,"height":396,"opacity":1,"rotation":0,"scale":{"x":0.2020202,"y":0.2020202},"tint":16777215}],"extends":{"cgroup":"Clock"}},{"depth":2,"tiles":[{"texture":"spritsheet","frame":0,"x":28,"y":664,"width":64,"height":64,"opacity":0,"rotation":0,"scale":{"x":1.625,"y":0.95},"tint":12566463}],"extends":{"cgroup":"Secret"}},{"depth":1,"tiles":[{"texture":"spritsheet","frame":0,"x":656,"y":32,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":400,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":-1,"y":10.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":160,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":0},{"texture":"spritsheet","frame":0,"x":656,"y":688,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":752,"y":288,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":5.5,"y":0.8888},"tint":12566463},{"texture":"spritsheet","frame":0,"x":752,"y":480,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":5.5,"y":0.8888},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":576,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":4},"tint":12566463}],"extends":{"cgroup":"Solid"}}]'),
    backgroundColor: '#000000',
    cameraConstraints: {"x1":1280,"y1":720,"x2":1280,"y2":720},
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room8 — core_OnRoomStart (On room start event) */
{
redPressed = false
bluePressed = false
greenPressed = false
if(glitchRoom != null){
        ct.rooms.remove(glitchRoom)
        glitchRoom = null
    }
if(Math.round(ct.random(10)) == 4){
    glitchRoom = ct.rooms.append('glitch');
}
if(sessionTimer == 0){
    sessionTimer = 30
}
var localTime = sessionTimer;
var textTimer = new PIXI.Text(localTime.toString(), ct.styles.get('MainStyle'));
textTimer.x = 96;
textTimer.y = 28;
textTimer.depth = 30; // ignore the error here, this works.
this.addChild(textTimer);
function startTimer(){
    var timer = ct.timer.add(1000, 'second').then(() => {
        localTime -= 1;
        sessionTimer = localTime
        textTimer.text = (localTime).toString();
        if(localTime < 4){
            ct.sound.spawn("bzzt")
        }
        if(localTime > 0){
            startTimer();
        } else {
            ct.rooms.switch("Death")
        }
    })
    .catch(e => {
        console.log('Timer killed', e);
    });
}
startTimer();
ct.transition.slideIn(200, "left")
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room9'] = {
    name: 'Room9',
    group: 'Room 1-10',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":192,"y":360,"opacity":1,"tint":16777215,"scale":{"x":0.19,"y":0.19},"rotation":0,"exts":{},"customProperties":{},"template":"player"},{"x":-736,"y":363,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1.01},"rotation":0,"exts":{},"customProperties":{},"template":"enemy"},{"x":1211.82608678,"y":664.73913028,"opacity":1,"tint":16777215,"scale":{"x":0.34782609,"y":0.34782609},"rotation":0,"exts":{},"customProperties":{},"template":"heartIndicator"},{"x":723.75777466,"y":560.8616603,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":1.5707963267948966,"exts":{},"customProperties":{"newProperty1":""},"template":"blueButton"},{"x":672,"y":480,"opacity":1,"tint":16777215,"scale":{"x":0.0625,"y":0.375},"rotation":1.5707963267948966,"exts":{},"customProperties":{"newProperty1":"","newProperty2":""},"template":"bluewall"},{"x":572,"y":632,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":0,"exts":{},"customProperties":{},"template":"redButton"},{"x":1120,"y":192,"opacity":1,"tint":16777215,"scale":{"x":0.0625,"y":0.375},"rotation":1.5707963267948966,"exts":{},"customProperties":{},"template":"redwall"},{"x":1152,"y":224,"opacity":1,"tint":16777215,"scale":{"x":0.125,"y":0.5},"rotation":0,"exts":{},"customProperties":{},"template":"greenwall"},{"x":1024,"y":72,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":3.141592653589793,"exts":{},"customProperties":{},"template":"greenButton"}]'),
    bgs: JSON.parse('[{"texture":"floor","depth":-20,"exts":{"movementX":0,"movementY":0,"parallaxX":0,"parallaxY":0,"repeat":"repeat","scaleX":1.5,"scaleY":1.5,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[{"depth":500,"tiles":[{"texture":"spritsheet","frame":1,"x":1248,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":16777215}],"extends":{"cgroup":"ExitDoor"}},{"depth":500,"tiles":[{"texture":"time","frame":0,"x":57.3030303,"y":51.55555556,"width":495,"height":396,"opacity":1,"rotation":0,"scale":{"x":0.2020202,"y":0.2020202},"tint":16777215}],"extends":{"cgroup":"Clock"}},{"depth":2,"tiles":[{"texture":"spritsheet","frame":0,"x":28,"y":664,"width":64,"height":64,"opacity":0,"rotation":0,"scale":{"x":1.625,"y":0.95},"tint":12566463}],"extends":{"cgroup":"Secret"}},{"depth":1,"tiles":[{"texture":"spritsheet","frame":0,"x":656,"y":32,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":400,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":-1,"y":10.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":160,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":0},{"texture":"spritsheet","frame":0,"x":656,"y":688,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":464,"y":576,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":0.5,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":688,"y":576,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":0.5,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1136,"y":128,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":0.5,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":912,"y":128,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":0.5,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":576,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":4},"tint":12566463}],"extends":{"cgroup":"Solid"}}]'),
    backgroundColor: '#000000',
    cameraConstraints: {"x1":1280,"y1":720,"x2":1280,"y2":720},
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room9 — core_OnRoomStart (On room start event) */
{
redPressed = false
bluePressed = false
greenPressed = false
if(glitchRoom != null){
        ct.rooms.remove(glitchRoom)
        glitchRoom = null
    }
if(Math.round(ct.random(10)) == 4){
    glitchRoom = ct.rooms.append('glitch');
}
if(sessionTimer == 0){
    sessionTimer = 30
}
var localTime = sessionTimer;
var textTimer = new PIXI.Text(localTime.toString(), ct.styles.get('MainStyle'));
textTimer.x = 96;
textTimer.y = 28;
textTimer.depth = 30; // ignore the error here, this works.
this.addChild(textTimer);
function startTimer(){
    var timer = ct.timer.add(1000, 'second').then(() => {
        localTime -= 1;
        sessionTimer = localTime
        textTimer.text = (localTime).toString();
        if(localTime < 4){
            ct.sound.spawn("bzzt")
        }
        if(localTime > 0){
            startTimer();
        } else {
            ct.rooms.switch("Death")
        }
    })
    .catch(e => {
        console.log('Timer killed', e);
    });
}
startTimer();
ct.transition.slideIn(200, "left")
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room10'] = {
    name: 'Room10',
    group: 'Room 1-10',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":192,"y":360,"opacity":1,"tint":16777215,"scale":{"x":0.19,"y":0.19},"rotation":0,"exts":{},"customProperties":{},"template":"player"},{"x":-736,"y":363,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1.01},"rotation":0,"exts":{},"customProperties":{},"template":"enemy"},{"x":1211.82608678,"y":664.73913028,"opacity":1,"tint":16777215,"scale":{"x":0.34782609,"y":0.34782609},"rotation":0,"exts":{},"customProperties":{},"template":"heartIndicator"}]'),
    bgs: JSON.parse('[{"texture":"floor","depth":-20,"exts":{"movementX":0,"movementY":0,"parallaxX":0,"parallaxY":0,"repeat":"repeat","scaleX":1.5,"scaleY":1.5,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[{"depth":500,"tiles":[{"texture":"spritsheet","frame":1,"x":1248,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":16777215}],"extends":{"cgroup":"ExitDoor"}},{"depth":500,"tiles":[{"texture":"time","frame":0,"x":57.3030303,"y":51.55555556,"width":495,"height":396,"opacity":1,"rotation":0,"scale":{"x":0.2020202,"y":0.2020202},"tint":16777215}],"extends":{"cgroup":"Clock"}},{"depth":2,"tiles":[{"texture":"spritsheet","frame":0,"x":28,"y":664,"width":64,"height":64,"opacity":0,"rotation":0,"scale":{"x":1.625,"y":0.95},"tint":12566463}],"extends":{"cgroup":"Secret"}},{"depth":1,"tiles":[{"texture":"spritsheet","frame":0,"x":656,"y":32,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":400,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":-1,"y":10.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":0},{"texture":"spritsheet","frame":0,"x":656,"y":688,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":584,"y":352,"width":64,"height":64,"opacity":1,"rotation":1.5707963267948966,"scale":{"x":0.5,"y":4.25},"tint":12566463},{"texture":"spritsheet","frame":0,"x":704,"y":304,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":0.5,"y":7.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":992,"y":448,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":0.5,"y":7},"tint":12566463},{"texture":"spritsheet","frame":0,"x":440,"y":192,"width":64,"height":64,"opacity":1,"rotation":1.5707963267948966,"scale":{"x":0.5,"y":4.25},"tint":12566463},{"texture":"spritsheet","frame":0,"x":568,"y":672,"width":64,"height":64,"opacity":1,"rotation":1.5707963267948966,"scale":{"x":0.5,"y":4.75},"tint":12566463},{"texture":"spritsheet","frame":0,"x":424,"y":512,"width":64,"height":64,"opacity":1,"rotation":1.5707963267948966,"scale":{"x":0.5,"y":3.75},"tint":12566463},{"texture":"spritsheet","frame":0,"x":320,"y":448,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":0.5,"y":8},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":160,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":576,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":4},"tint":12566463}],"extends":{"cgroup":"Solid"}}]'),
    backgroundColor: '#000000',
    cameraConstraints: {"x1":1280,"y1":720,"x2":1280,"y2":720},
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room10 — core_OnRoomStart (On room start event) */
{
redPressed = false
bluePressed = false
greenPressed = false
if(glitchRoom != null){
        ct.rooms.remove(glitchRoom)
        glitchRoom = null
    }
if(Math.round(ct.random(10)) == 4){
    glitchRoom = ct.rooms.append('glitch');
}
if(sessionTimer == 0){
    sessionTimer = 30
}
var localTime = sessionTimer;
var textTimer = new PIXI.Text(localTime.toString(), ct.styles.get('MainStyle'));
textTimer.x = 96;
textTimer.y = 28;
textTimer.depth = 30; // ignore the error here, this works.
this.addChild(textTimer);
function startTimer(){
    var timer = ct.timer.add(1000, 'second').then(() => {
        localTime -= 1;
        sessionTimer = localTime
        textTimer.text = (localTime).toString();
        if(localTime < 4){
            ct.sound.spawn("bzzt")
        }
        if(localTime > 0){
            startTimer();
        } else {
            ct.rooms.switch("Death")
        }
    })
    .catch(e => {
        console.log('Timer killed', e);
    });
}
startTimer();
ct.transition.slideIn(200, "left")
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['menu'] = {
    name: 'menu',
    group: 'ungrouped',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":520,"y":352,"opacity":1,"tint":16777215,"scale":{"x":0.38979592,"y":0.38979592},"rotation":0,"exts":{},"customProperties":{},"template":"startBtn"},{"x":636.06956522,"y":483.25217391,"opacity":1,"tint":16777215,"scale":{"x":0.49565217,"y":0.49565217},"rotation":0,"exts":{},"customProperties":{},"template":"easyMode"}]'),
    bgs: JSON.parse('[{"texture":"menuBg","depth":0,"exts":{"movementX":0,"movementY":0,"parallaxX":1,"parallaxY":1,"repeat":"no-repeat","scaleX":1,"scaleY":1,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[]'),
    backgroundColor: '#000000',
    
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room menu — core_OnRoomStart (On room start event) */
{
ct.sound.stop('menu_jingle')
ct.sound.spawn('menu_jingle')
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['guide'] = {
    name: 'guide',
    group: 'ungrouped',
    width: 1280,
    height: 720,
    objects: JSON.parse('[]'),
    bgs: JSON.parse('[]'),
    tiles: JSON.parse('[{"depth":1,"tiles":[{"texture":"littleGuide","frame":0,"x":448,"y":96,"width":378,"height":510,"opacity":1,"rotation":0,"scale":{"x":1,"y":1},"tint":16777215}],"extends":{}}]'),
    backgroundColor: '#000000',
    
    onStep() {
        /* room guide — core_OnActionPress (OnActionPress event) */

if (ct.actions['Restart'].pressed) {
    let value = ct.actions['Restart'].value;
    
ct.transition.fadeOut(1000).then(()=>{
    ct.rooms.switch('Room1')
})

}

    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room guide — core_OnRoomStart (On room start event) */
{
ct.transition.fadeIn(500);
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room11'] = {
    name: 'Room11',
    group: 'Room 11-20',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":192,"y":360,"opacity":1,"tint":16777215,"scale":{"x":0.2,"y":0.2},"rotation":0,"exts":{},"customProperties":{},"template":"player"},{"x":-736,"y":363,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1.01},"rotation":0,"exts":{},"customProperties":{},"template":"enemy"},{"x":1211.82608678,"y":664.73913028,"opacity":1,"tint":16777215,"scale":{"x":0.34782609,"y":0.34782609},"rotation":0,"exts":{},"customProperties":{},"template":"heartIndicator"},{"x":1195.75786235,"y":152.86829526,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":-1.5707963267948966,"exts":{},"customProperties":{"newProperty1":""},"template":"blueButton"},{"x":384,"y":128,"opacity":1,"tint":16777215,"scale":{"x":0.3125,"y":0.0625},"rotation":0,"exts":{},"customProperties":{"newProperty1":"","newProperty2":""},"template":"bluewall"},{"x":464,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":3.141592653589793,"exts":{},"customProperties":{},"template":"redButton"},{"x":384,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.0625,"y":0.1875},"rotation":0,"exts":{},"customProperties":{"newProperty1":"","newProperty2":""},"template":"bluewall"},{"x":512,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.0625,"y":0.1875},"rotation":0,"exts":{},"customProperties":{"newProperty1":"","newProperty2":""},"template":"bluewall"},{"x":1152,"y":224,"opacity":1,"tint":16777215,"scale":{"x":0.125,"y":0.5},"rotation":0,"exts":{},"customProperties":{},"template":"redwall"}]'),
    bgs: JSON.parse('[{"texture":"floor","depth":-20,"exts":{"movementX":0,"movementY":0,"parallaxX":0,"parallaxY":0,"repeat":"repeat","scaleX":1.5,"scaleY":1.5,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[{"depth":500,"tiles":[{"texture":"spritsheet","frame":1,"x":1248,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":16777215}],"extends":{"cgroup":"ExitDoor"}},{"depth":500,"tiles":[{"texture":"time","frame":0,"x":57.3030303,"y":51.55555556,"width":495,"height":396,"opacity":1,"rotation":0,"scale":{"x":0.2020202,"y":0.2020202},"tint":16777215}],"extends":{"cgroup":"Clock"}},{"depth":2,"tiles":[{"texture":"spritsheet","frame":0,"x":28,"y":664,"width":64,"height":64,"opacity":0,"rotation":0,"scale":{"x":1.625,"y":0.95},"tint":12566463}],"extends":{"cgroup":"Secret"}},{"depth":1,"tiles":[{"texture":"spritsheet","frame":0,"x":656,"y":32,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":400,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":-1,"y":10.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":160,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":0},{"texture":"spritsheet","frame":0,"x":656,"y":688,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":576,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":4},"tint":12566463}],"extends":{"cgroup":"Solid"}}]'),
    backgroundColor: '#000000',
    cameraConstraints: {"x1":1280,"y1":720,"x2":1280,"y2":720},
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room11 — core_OnRoomStart (On room start event) */
{
redPressed = false
bluePressed = false
greenPressed = false
if(glitchRoom != null){
        ct.rooms.remove(glitchRoom)
        glitchRoom = null
    }
if(Math.round(ct.random(10)) == 4){
    glitchRoom = ct.rooms.append('glitch');
}
if(sessionTimer == 0){
    sessionTimer = 30
}
var localTime = sessionTimer;
var textTimer = new PIXI.Text(localTime.toString(), ct.styles.get('MainStyle'));
textTimer.x = 96;
textTimer.y = 28;
textTimer.depth = 30; // ignore the error here, this works.
this.addChild(textTimer);
this.textLabel = new PIXI.Text('Floor 3. RUN.', ct.styles.get('MainStyle')); 
this.textLabel.x = 450;
this.textLabel.y = 330;
this.textLabel.depth = -12;
this.addChild(this.textLabel);
function startTimer(){
    var timer = ct.timer.add(1000, 'second').then(() => {
        localTime -= 1;
        sessionTimer = localTime
        textTimer.text = (localTime).toString();
        if(localTime < 4){
            ct.sound.spawn("bzzt")
        }
        if(localTime > 0){
            startTimer();
        } else {
            ct.rooms.switch("Death")
        }
    })
    .catch(e => {
        console.log('Timer killed', e);
    });
}
startTimer();
ct.transition.slideIn(200, "left")
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room12'] = {
    name: 'Room12',
    group: 'Room 11-20',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":192,"y":360,"opacity":1,"tint":16777215,"scale":{"x":0.2,"y":0.2},"rotation":0,"exts":{},"customProperties":{},"template":"player"},{"x":-736,"y":363,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1.01},"rotation":0,"exts":{},"customProperties":{},"template":"enemy"},{"x":1211.82608678,"y":664.73913028,"opacity":1,"tint":16777215,"scale":{"x":0.34782609,"y":0.34782609},"rotation":0,"exts":{},"customProperties":{},"template":"heartIndicator"}]'),
    bgs: JSON.parse('[{"texture":"floor","depth":-20,"exts":{"movementX":0,"movementY":0,"parallaxX":0,"parallaxY":0,"repeat":"repeat","scaleX":1.5,"scaleY":1.5,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[{"depth":500,"tiles":[{"texture":"spritsheet","frame":1,"x":1248,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":16777215}],"extends":{"cgroup":"ExitDoor"}},{"depth":500,"tiles":[{"texture":"time","frame":0,"x":57.3030303,"y":51.55555556,"width":495,"height":396,"opacity":1,"rotation":0,"scale":{"x":0.2020202,"y":0.2020202},"tint":16777215}],"extends":{"cgroup":"Clock"}},{"depth":2,"tiles":[{"texture":"spritsheet","frame":0,"x":28,"y":664,"width":64,"height":64,"opacity":0,"rotation":0,"scale":{"x":1.625,"y":0.95},"tint":12566463}],"extends":{"cgroup":"Secret"}},{"depth":1,"tiles":[{"texture":"spritsheet","frame":0,"x":656,"y":32,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":400,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":-1,"y":10.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":160,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":0},{"texture":"spritsheet","frame":0,"x":656,"y":688,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":256,"y":144,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":8,"y":3.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":432,"y":464,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":2.5,"y":0.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":816,"y":464,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":2.5,"y":0.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1040,"y":464,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":5.5,"y":0.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":496,"y":240,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":0.5,"y":7.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":752,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":0.5,"y":4},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1120,"y":240,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":5,"y":0.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":576,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":4},"tint":12566463}],"extends":{"cgroup":"Solid"}}]'),
    backgroundColor: '#000000',
    cameraConstraints: {"x1":1280,"y1":720,"x2":1280,"y2":720},
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room12 — core_OnRoomStart (On room start event) */
{
redPressed = false
bluePressed = false
greenPressed = false
if(glitchRoom != null){
        ct.rooms.remove(glitchRoom)
        glitchRoom = null
    }
if(Math.round(ct.random(10)) == 4){
    glitchRoom = ct.rooms.append('glitch');
}
if(sessionTimer == 0){
    sessionTimer = 30
}
var localTime = sessionTimer;
var textTimer = new PIXI.Text(localTime.toString(), ct.styles.get('MainStyle'));
textTimer.x = 96;
textTimer.y = 28;
textTimer.depth = 30; // ignore the error here, this works.
this.addChild(textTimer);
function startTimer(){
    var timer = ct.timer.add(1000, 'second').then(() => {
        localTime -= 1;
        sessionTimer = localTime
        textTimer.text = (localTime).toString();
        if(localTime < 4){
            ct.sound.spawn("bzzt")
        }
        if(localTime > 0){
            startTimer();
        } else {
            ct.rooms.switch("Death")
        }
    })
    .catch(e => {
        console.log('Timer killed', e);
    });
}
startTimer();
ct.transition.slideIn(200, "left")
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room13'] = {
    name: 'Room13',
    group: 'Room 11-20',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":192,"y":360,"opacity":1,"tint":16777215,"scale":{"x":0.19,"y":0.19},"rotation":0,"exts":{},"customProperties":{},"template":"player"},{"x":-736,"y":363,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1.01},"rotation":0,"exts":{},"customProperties":{},"template":"enemy"},{"x":1211.82608678,"y":664.73913028,"opacity":1,"tint":16777215,"scale":{"x":0.34782609,"y":0.34782609},"rotation":0,"exts":{},"customProperties":{},"template":"heartIndicator"},{"x":1200,"y":160,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":-1.5707963267948966,"exts":{},"customProperties":{},"template":"redButton"},{"x":1056,"y":-64,"opacity":1,"tint":16777215,"scale":{"x":0.0625,"y":1.5},"rotation":0,"exts":{},"customProperties":{},"template":"greenwall"},{"x":192,"y":72,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":3.141592653589793,"exts":{},"customProperties":{},"template":"greenButton"},{"x":544,"y":160,"opacity":1,"tint":16777215,"scale":{"x":0.375,"y":0.0625},"rotation":0,"exts":{},"customProperties":{},"template":"redwall"},{"x":704,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.0625,"y":0.25},"rotation":0,"exts":{},"customProperties":{},"template":"redwall"},{"x":624,"y":80,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":3.141592653589793,"exts":{},"customProperties":{},"template":"blueButton"},{"x":1184,"y":256,"opacity":1,"tint":16777215,"scale":{"x":0.0625,"y":0.375},"rotation":0,"exts":{},"customProperties":{},"template":"bluewall"}]'),
    bgs: JSON.parse('[{"texture":"floor","depth":-20,"exts":{"movementX":0,"movementY":0,"parallaxX":0,"parallaxY":0,"repeat":"repeat","scaleX":1.5,"scaleY":1.5,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[{"depth":500,"tiles":[{"texture":"spritsheet","frame":1,"x":1248,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":16777215}],"extends":{"cgroup":"ExitDoor"}},{"depth":500,"tiles":[{"texture":"time","frame":0,"x":57.3030303,"y":51.55555556,"width":495,"height":396,"opacity":1,"rotation":0,"scale":{"x":0.2020202,"y":0.2020202},"tint":16777215}],"extends":{"cgroup":"Clock"}},{"depth":2,"tiles":[{"texture":"spritsheet","frame":0,"x":28,"y":664,"width":64,"height":64,"opacity":0,"rotation":0,"scale":{"x":1.625,"y":0.95},"tint":12566463}],"extends":{"cgroup":"Secret"}},{"depth":1,"tiles":[{"texture":"spritsheet","frame":0,"x":656,"y":32,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":400,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":-1,"y":10.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":160,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":0},{"texture":"spritsheet","frame":0,"x":656,"y":688,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":528,"y":128,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":0.5,"y":2},"tint":12566463},{"texture":"spritsheet","frame":0,"x":192,"y":240,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":5,"y":0.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":576,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":4},"tint":12566463}],"extends":{"cgroup":"Solid"}}]'),
    backgroundColor: '#000000',
    cameraConstraints: {"x1":1280,"y1":720,"x2":1280,"y2":720},
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room13 — core_OnRoomStart (On room start event) */
{
redPressed = false
bluePressed = false
greenPressed = false
if(glitchRoom != null){
        ct.rooms.remove(glitchRoom)
        glitchRoom = null
    }
if(Math.round(ct.random(10)) == 4){
    glitchRoom = ct.rooms.append('glitch');
}
if(sessionTimer == 0){
    sessionTimer = 30
}
var localTime = sessionTimer;
var textTimer = new PIXI.Text(localTime.toString(), ct.styles.get('MainStyle'));
textTimer.x = 96;
textTimer.y = 28;
textTimer.depth = 30; // ignore the error here, this works.
this.addChild(textTimer);
function startTimer(){
    var timer = ct.timer.add(1000, 'second').then(() => {
        localTime -= 1;
        sessionTimer = localTime
        textTimer.text = (localTime).toString();
        if(localTime < 4){
            ct.sound.spawn("bzzt")
        }
        if(localTime > 0){
            startTimer();
        } else {
            ct.rooms.switch("Death")
        }
    })
    .catch(e => {
        console.log('Timer killed', e);
    });
}
startTimer();
ct.transition.slideIn(200, "left")
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room14'] = {
    name: 'Room14',
    group: 'Room 11-20',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":192,"y":360,"opacity":1,"tint":16777215,"scale":{"x":0.19,"y":0.19},"rotation":0,"exts":{},"customProperties":{},"template":"player"},{"x":-736,"y":363,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1.01},"rotation":0,"exts":{},"customProperties":{},"template":"enemy"},{"x":1211.82608678,"y":664.73913028,"opacity":1,"tint":16777215,"scale":{"x":0.34782609,"y":0.34782609},"rotation":0,"exts":{},"customProperties":{},"template":"heartIndicator"},{"x":976,"y":480,"opacity":1,"tint":16777215,"scale":{"x":0.03125,"y":0.375},"rotation":0,"exts":{},"customProperties":{},"template":"bluewall"},{"x":192,"y":224,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":3.141592653589793,"exts":{},"customProperties":{},"template":"blueButton"}]'),
    bgs: JSON.parse('[{"texture":"floor","depth":-20,"exts":{"movementX":0,"movementY":0,"parallaxX":0,"parallaxY":0,"repeat":"repeat","scaleX":1.5,"scaleY":1.5,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[{"depth":500,"tiles":[{"texture":"spritsheet","frame":1,"x":1248,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":16777215}],"extends":{"cgroup":"ExitDoor"}},{"depth":500,"tiles":[{"texture":"time","frame":0,"x":57.3030303,"y":51.55555556,"width":495,"height":396,"opacity":1,"rotation":0,"scale":{"x":0.2020202,"y":0.2020202},"tint":16777215}],"extends":{"cgroup":"Clock"}},{"depth":499,"tiles":[],"extends":{"cgroup":"Uhoh"}},{"depth":3,"tiles":[{"texture":"spritsheet","frame":0,"x":160,"y":128,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":4,"y":2.5},"tint":12566463}],"extends":{"cgroup":"Pant"}},{"depth":2,"tiles":[{"texture":"spritsheet","frame":0,"x":28,"y":664,"width":64,"height":64,"opacity":0,"rotation":0,"scale":{"x":1.625,"y":0.95},"tint":12566463}],"extends":{"cgroup":"Secret"}},{"depth":2,"tiles":[{"texture":"spritsheet","frame":0,"x":312,"y":144,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":0.75,"y":2.5},"tint":12566463}],"extends":{"cgroup":"UhOh"}},{"depth":1,"tiles":[{"texture":"spritsheet","frame":0,"x":656,"y":32,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":400,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":-1,"y":10.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":160,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":0},{"texture":"spritsheet","frame":0,"x":656,"y":688,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":600,"y":288,"width":64,"height":64,"opacity":1,"rotation":1.5707963267948966,"scale":{"x":0.5,"y":3.75},"tint":12566463},{"texture":"spritsheet","frame":0,"x":704,"y":496,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":0.5,"y":6.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":992,"y":272,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":0.5,"y":6.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":568,"y":672,"width":64,"height":64,"opacity":1,"rotation":1.5707963267948966,"scale":{"x":0.5,"y":4.75},"tint":12566463},{"texture":"spritsheet","frame":0,"x":424,"y":512,"width":64,"height":64,"opacity":1,"rotation":1.5707963267948966,"scale":{"x":0.5,"y":3.75},"tint":12566463},{"texture":"spritsheet","frame":0,"x":320,"y":368,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":0.5,"y":4.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":160,"y":208,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":5.5,"y":0.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":576,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":4},"tint":12566463}],"extends":{"cgroup":"Solid"}}]'),
    backgroundColor: '#000000',
    cameraConstraints: {"x1":1280,"y1":720,"x2":1280,"y2":720},
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room14 — core_OnRoomStart (On room start event) */
{
redPressed = false
bluePressed = false
greenPressed = false
if(glitchRoom != null){
        ct.rooms.remove(glitchRoom)
        glitchRoom = null
    }
if(Math.round(ct.random(10)) == 4){
    glitchRoom = ct.rooms.append('glitch');
}
if(sessionTimer == 0){
    sessionTimer = 30
}
var localTime = sessionTimer;
var textTimer = new PIXI.Text(localTime.toString(), ct.styles.get('MainStyle'));
textTimer.x = 96;
textTimer.y = 28;
textTimer.depth = 30; // ignore the error here, this works.
this.addChild(textTimer);
function startTimer(){
    var timer = ct.timer.add(1000, 'second').then(() => {
        localTime -= 1;
        sessionTimer = localTime
        textTimer.text = (localTime).toString();
        if(localTime < 4){
            ct.sound.spawn("bzzt")
        }
        if(localTime > 0){
            startTimer();
        } else {
            ct.rooms.switch("Death")
        }
    })
    .catch(e => {
        console.log('Timer killed', e);
    });
}
startTimer();
ct.transition.slideIn(200, "left")
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room25'] = {
    name: 'Room25',
    group: 'Room 21-30',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":192,"y":360,"opacity":1,"tint":16777215,"scale":{"x":0.19,"y":0.19},"rotation":0,"exts":{},"customProperties":{},"template":"player"},{"x":-736,"y":363,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1.01},"rotation":0,"exts":{},"customProperties":{},"template":"enemy"},{"x":1211.82608678,"y":664.73913028,"opacity":1,"tint":16777215,"scale":{"x":0.34782609,"y":0.34782609},"rotation":0,"exts":{},"customProperties":{},"template":"heartIndicator"}]'),
    bgs: JSON.parse('[{"texture":"floor","depth":-20,"exts":{"movementX":0,"movementY":0,"parallaxX":0,"parallaxY":0,"repeat":"repeat","scaleX":1.5,"scaleY":1.5,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[{"depth":500,"tiles":[{"texture":"spritsheet","frame":1,"x":1312,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":16777215}],"extends":{"cgroup":"ExitDoor"}},{"depth":500,"tiles":[],"extends":{"cgroup":"Clock"}},{"depth":2,"tiles":[{"texture":"spritsheet","frame":0,"x":28,"y":664,"width":64,"height":64,"opacity":0,"rotation":0,"scale":{"x":1.625,"y":0.95},"tint":12566463}],"extends":{"cgroup":"Secret"}},{"depth":1,"tiles":[{"texture":"spritsheet","frame":0,"x":656,"y":128,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":4},"tint":12566463},{"texture":"spritsheet","frame":0,"x":656,"y":584,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":4.25},"tint":12566463}],"extends":{"cgroup":"Solid"}}]'),
    backgroundColor: '#000000',
    cameraConstraints: {"x1":1280,"y1":720,"x2":1280,"y2":720},
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room25 — core_OnRoomStart (On room start event) */
{
redPressed = false
bluePressed = false
greenPressed = false
if(glitchRoom != null){
    ct.rooms.remove(glitchRoom)
    glitchRoom = null
}
if(Math.round(ct.random(100)) == 4){
    glitchRoom = ct.rooms.append('glitch');
}
this.textLabel = new PIXI.Text('RUN. RUN. RUN. RUN. RUN. RUN. RUN. RUN. RUN. RUN. RUN. RUN. RUN. RUN. RUN. RUN.', ct.styles.get('MainStyle')); 
this.textLabel.x = 0;
this.textLabel.y = 330;
this.textLabel.depth = -12;
this.addChild(this.textLabel);
ct.sound.spawn('bzzt2')
function expSpeed(){
    var timer = ct.timer.add(50, 'expSpeed').then(() => {
        ct.camera.shake += 0.05
        ct.camera.shakeDecay = 0
        monsterSpeedMultiplier += 0.25;
        playerSpeedMultiplier = 1.5
        expSpeed();
    })
    .catch(e => {
        console.log('Timer killed', e);
    });
}
expSpeed();
ct.transition.slideIn(200, "left")
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Ending'] = {
    name: 'Ending',
    group: 'ungrouped',
    width: 1280,
    height: 720,
    objects: JSON.parse('[]'),
    bgs: JSON.parse('[]'),
    tiles: JSON.parse('[]'),
    backgroundColor: '#000000',
    
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Ending — core_OnRoomStart (On room start event) */
{
ct.sound.stop('footsteps')
ct.sound.stop("glitch")
ct.camera.shake = 0
ct.camera.shakeDecay = 9999
setTimeout(()=>{
    ct.camera.shake = 0
    ct.camera.shakeDecay = 9999
    this.textLabel = new PIXI.Text('You did it. You escaped.', ct.styles.get('MainStyle')); 
    this.textLabel.x = 100;
    this.textLabel.y = 330;
    this.textLabel.depth = -12;
    this.addChild(this.textLabel);
    ct.sound.spawn('beep');
    setTimeout(()=>{
        ct.sound.spawn('beep');
        this.textLabel.text = "You did it. You escaped... or did you?"
        setTimeout(()=>{
            ct.sound.spawn('beep');
            this.textLabel.text = ""
            setTimeout(()=>{
                ct.rooms.switch('menu')
            },3000)
        },5000)
    },4000)
},3000)
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['glitch'] = {
    name: 'glitch',
    group: 'ungrouped',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":643,"y":355,"opacity":0.07,"tint":16777215,"scale":{"x":2.548,"y":1.6520000000000001},"rotation":0,"exts":{},"customProperties":{},"template":"glitch"}]'),
    bgs: JSON.parse('[]'),
    tiles: JSON.parse('[]'),
    backgroundColor: '#000000',
    
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        /* room glitch — core_OnRoomEnd (On room end event) */
{
console.log("Hello")
ct.sound.stop('glitch')
ct.camera.shake = 0
monsterSpeedMultiplier -= 0.5
playerSpeedMultiplier -= 0.6
}

    },
    onCreate() {
        /* room glitch — core_OnRoomStart (On room start event) */
{
if(!ct.sound.playing('glitch')){
    ct.sound.spawn('glitch')
}
ct.camera.shake = 0.4
ct.camera.shakeDecay = 0
monsterSpeedMultiplier += 0.5
playerSpeedMultiplier += 0.6
}

    },
    isUi: true,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room15'] = {
    name: 'Room15',
    group: 'Room 11-20',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":192,"y":360,"opacity":1,"tint":16777215,"scale":{"x":0.19,"y":0.19},"rotation":0,"exts":{},"customProperties":{},"template":"player"},{"x":-736,"y":363,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1.01},"rotation":0,"exts":{},"customProperties":{},"template":"enemy"},{"x":1211.82608678,"y":664.73913028,"opacity":1,"tint":16777215,"scale":{"x":0.34782609,"y":0.34782609},"rotation":0,"exts":{},"customProperties":{},"template":"heartIndicator"},{"x":1200,"y":160,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":-1.5707963267948966,"exts":{},"customProperties":{},"template":"redButton"},{"x":200,"y":640,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":0,"exts":{},"customProperties":{},"template":"greenButton"},{"x":576,"y":192,"opacity":1,"tint":16777215,"scale":{"x":0.3125,"y":0.0625},"rotation":0,"exts":{},"customProperties":{},"template":"redwall"},{"x":640,"y":80,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":3.141592653589793,"exts":{},"customProperties":{},"template":"blueButton"},{"x":1184,"y":256,"opacity":1,"tint":16777215,"scale":{"x":0.0625,"y":0.375},"rotation":0,"exts":{},"customProperties":{},"template":"bluewall"},{"x":704,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.0625,"y":0.25},"rotation":0,"exts":{},"customProperties":{},"template":"redwall"},{"x":544,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.0625,"y":0.3125},"rotation":0,"exts":{},"customProperties":{},"template":"redwall"},{"x":544,"y":0,"opacity":1,"tint":16777215,"scale":{"x":0.0625,"y":1.5},"rotation":0,"exts":{},"customProperties":{},"template":"greenwall"}]'),
    bgs: JSON.parse('[{"texture":"floor","depth":-20,"exts":{"movementX":0,"movementY":0,"parallaxX":0,"parallaxY":0,"repeat":"repeat","scaleX":1.5,"scaleY":1.5,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[{"depth":500,"tiles":[{"texture":"spritsheet","frame":1,"x":1248,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":16777215}],"extends":{"cgroup":"ExitDoor"}},{"depth":500,"tiles":[{"texture":"time","frame":0,"x":57.3030303,"y":51.55555556,"width":495,"height":396,"opacity":1,"rotation":0,"scale":{"x":0.2020202,"y":0.2020202},"tint":16777215}],"extends":{"cgroup":"Clock"}},{"depth":2,"tiles":[{"texture":"spritsheet","frame":0,"x":28,"y":664,"width":64,"height":64,"opacity":0,"rotation":0,"scale":{"x":1.625,"y":0.95},"tint":12566463}],"extends":{"cgroup":"Secret"}},{"depth":1,"tiles":[{"texture":"spritsheet","frame":0,"x":656,"y":32,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":400,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":-1,"y":10.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":160,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":0},{"texture":"spritsheet","frame":0,"x":656,"y":688,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":224,"y":464,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":5,"y":0.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":576,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":4},"tint":12566463}],"extends":{"cgroup":"Solid"}}]'),
    backgroundColor: '#000000',
    cameraConstraints: {"x1":1280,"y1":720,"x2":1280,"y2":720},
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room15 — core_OnRoomStart (On room start event) */
{
redPressed = false
bluePressed = false
greenPressed = false
if(glitchRoom != null){
        ct.rooms.remove(glitchRoom)
        glitchRoom = null
    }
if(Math.round(ct.random(10)) == 4){
    glitchRoom = ct.rooms.append('glitch');
}
if(sessionTimer == 0){
    sessionTimer = 30
}
var localTime = sessionTimer;
var textTimer = new PIXI.Text(localTime.toString(), ct.styles.get('MainStyle'));
textTimer.x = 96;
textTimer.y = 28;
textTimer.depth = 30; // ignore the error here, this works.
this.addChild(textTimer);
function startTimer(){
    var timer = ct.timer.add(1000, 'second').then(() => {
        localTime -= 1;
        sessionTimer = localTime
        textTimer.text = (localTime).toString();
        if(localTime < 4){
            ct.sound.spawn("bzzt")
        }
        if(localTime > 0){
            startTimer();
        } else {
            ct.rooms.switch("Death")
        }
    })
    .catch(e => {
        console.log('Timer killed', e);
    });
}
startTimer();
ct.transition.slideIn(200, "left")
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room16'] = {
    name: 'Room16',
    group: 'Room 11-20',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":192,"y":360,"opacity":1,"tint":16777215,"scale":{"x":0.2,"y":0.2},"rotation":0,"exts":{},"customProperties":{},"template":"player"},{"x":-736,"y":363,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1.01},"rotation":0,"exts":{},"customProperties":{},"template":"enemy"},{"x":1211.82608678,"y":664.73913028,"opacity":1,"tint":16777215,"scale":{"x":0.34782609,"y":0.34782609},"rotation":0,"exts":{},"customProperties":{},"template":"heartIndicator"},{"x":635.75786235,"y":80.86829526,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":-3.141592653589793,"exts":{},"customProperties":{"newProperty1":""},"template":"blueButton"},{"x":1088,"y":32,"opacity":1,"tint":16777215,"scale":{"x":0.125,"y":1.3125},"rotation":0,"exts":{},"customProperties":{"newProperty1":"","newProperty2":""},"template":"bluewall"},{"x":635.75786235,"y":640,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":0,"exts":{},"customProperties":{},"template":"redButton"},{"x":784,"y":224,"opacity":1,"tint":16777215,"scale":{"x":0.0625,"y":0.5625},"rotation":1.5707963267948966,"exts":{},"customProperties":{},"template":"redwall"}]'),
    bgs: JSON.parse('[{"texture":"floor","depth":-20,"exts":{"movementX":0,"movementY":0,"parallaxX":0,"parallaxY":0,"repeat":"repeat","scaleX":1.5,"scaleY":1.5,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[{"depth":500,"tiles":[{"texture":"spritsheet","frame":1,"x":1248,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":16777215}],"extends":{"cgroup":"ExitDoor"}},{"depth":500,"tiles":[{"texture":"time","frame":0,"x":57.3030303,"y":51.55555556,"width":495,"height":396,"opacity":1,"rotation":0,"scale":{"x":0.2020202,"y":0.2020202},"tint":16777215}],"extends":{"cgroup":"Clock"}},{"depth":2,"tiles":[{"texture":"spritsheet","frame":0,"x":28,"y":664,"width":64,"height":64,"opacity":0,"rotation":0,"scale":{"x":1.625,"y":0.95},"tint":12566463}],"extends":{"cgroup":"Secret"}},{"depth":1,"tiles":[{"texture":"spritsheet","frame":0,"x":656,"y":32,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":400,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":-1,"y":10.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":160,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":0},{"texture":"spritsheet","frame":0,"x":656,"y":688,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":256,"y":128,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":8,"y":4},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1024,"y":128,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":8,"y":4},"tint":12566463},{"texture":"spritsheet","frame":0,"x":256,"y":576,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":8,"y":4},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1024,"y":576,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":8,"y":4},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":576,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":4},"tint":12566463}],"extends":{"cgroup":"Solid"}}]'),
    backgroundColor: '#000000',
    cameraConstraints: {"x1":1280,"y1":720,"x2":1280,"y2":720},
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room16 — core_OnRoomStart (On room start event) */
{
redPressed = false
bluePressed = false
greenPressed = false
if(sessionTimer == 0){
    sessionTimer = 30
}
if(glitchRoom != null){
        ct.rooms.remove(glitchRoom)
        glitchRoom = null
    }
if(Math.round(ct.random(10)) == 4){
    glitchRoom = ct.rooms.append('glitch');
}
var localTime = sessionTimer;
var textTimer = new PIXI.Text(localTime.toString(), ct.styles.get('MainStyle'));
textTimer.x = 96;
textTimer.y = 28;
textTimer.depth = 30; // ignore the error here, this works.
this.addChild(textTimer);
var curRoom = parseInt(ct.room.name.replace('Room',''));
if((curRoom-1)/5 == Math.round((curRoom-1)/5)){
    this.textLabel = new PIXI.Text('Floor '+(((curRoom-1)/5)+1).toString()+'. RUN.', ct.styles.get('MainStyle')); 
    this.textLabel.x = 450;
    this.textLabel.y = 330;
    this.textLabel.depth = -12;
    this.addChild(this.textLabel);
}
function startTimer(){
    var timer = ct.timer.add(1000, 'second').then(() => {
        localTime -= 1;
        sessionTimer = localTime
        textTimer.text = (localTime).toString();
        if(localTime < 4){
            ct.sound.spawn("bzzt")
        }
        if(localTime > 0){
            startTimer();
        } else {
            ct.rooms.switch("Death")
        }
    })
    .catch(e => {
        console.log('Timer killed', e);
    });
}
startTimer();
ct.transition.slideIn(200, "left")
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room17'] = {
    name: 'Room17',
    group: 'Room 11-20',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":192,"y":360,"opacity":1,"tint":16777215,"scale":{"x":0.2,"y":0.2},"rotation":0,"exts":{},"customProperties":{},"template":"player"},{"x":-736,"y":363,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1.01},"rotation":0,"exts":{},"customProperties":{},"template":"enemy"},{"x":1211.82608678,"y":664.73913028,"opacity":1,"tint":16777215,"scale":{"x":0.34782609,"y":0.34782609},"rotation":0,"exts":{},"customProperties":{},"template":"heartIndicator"},{"x":955.75786235,"y":368,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":-1.5707963267948966,"exts":{},"customProperties":{},"template":"redButton"},{"x":608,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.0625,"y":0.1875},"rotation":0,"exts":{},"customProperties":{},"template":"redwall"},{"x":800,"y":128,"opacity":1,"tint":16777215,"scale":{"x":0.0625,"y":0.3125},"rotation":1.5707963267948966,"exts":{},"customProperties":{},"template":"redwall"},{"x":720,"y":80,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":3.141592653589793,"exts":{},"customProperties":{},"template":"blueButton"},{"x":800,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.0625,"y":0.1875},"rotation":0,"exts":{},"customProperties":{},"template":"redwall"},{"x":1184,"y":256,"opacity":1,"tint":16777215,"scale":{"x":0.0625,"y":0.375},"rotation":0,"exts":{},"customProperties":{},"template":"bluewall"}]'),
    bgs: JSON.parse('[{"texture":"floor","depth":-20,"exts":{"movementX":0,"movementY":0,"parallaxX":0,"parallaxY":0,"repeat":"repeat","scaleX":1.5,"scaleY":1.5,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[{"depth":500,"tiles":[{"texture":"spritsheet","frame":1,"x":1248,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":16777215}],"extends":{"cgroup":"ExitDoor"}},{"depth":500,"tiles":[{"texture":"time","frame":0,"x":57.3030303,"y":51.55555556,"width":495,"height":396,"opacity":1,"rotation":0,"scale":{"x":0.2020202,"y":0.2020202},"tint":16777215}],"extends":{"cgroup":"Clock"}},{"depth":2,"tiles":[{"texture":"spritsheet","frame":0,"x":28,"y":664,"width":64,"height":64,"opacity":0,"rotation":0,"scale":{"x":1.625,"y":0.95},"tint":12566463}],"extends":{"cgroup":"Secret"}},{"depth":1,"tiles":[{"texture":"spritsheet","frame":0,"x":656,"y":32,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":400,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":-1,"y":10.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":160,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":0},{"texture":"spritsheet","frame":0,"x":656,"y":688,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":672,"y":272,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":12,"y":0.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1200,"y":128,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":0.5,"y":4},"tint":12566463},{"texture":"spritsheet","frame":0,"x":256,"y":576,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":8,"y":4},"tint":12566463},{"texture":"spritsheet","frame":0,"x":944,"y":464,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":3.5,"y":0.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":400,"y":496,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":3.5,"y":6.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1200,"y":576,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":0.5,"y":4},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1008,"y":368,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":3.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":592,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":4.5},"tint":12566463}],"extends":{"cgroup":"Solid"}}]'),
    backgroundColor: '#000000',
    cameraConstraints: {"x1":1280,"y1":720,"x2":1280,"y2":720},
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room17 — core_OnRoomStart (On room start event) */
{
redPressed = false
bluePressed = false
greenPressed = false
if(sessionTimer == 0){
    sessionTimer = 30
}
if(glitchRoom != null){
        ct.rooms.remove(glitchRoom)
        glitchRoom = null
    }
if(Math.round(ct.random(10)) == 4){
    glitchRoom = ct.rooms.append('glitch');
}
var localTime = sessionTimer;
var textTimer = new PIXI.Text(localTime.toString(), ct.styles.get('MainStyle'));
textTimer.x = 96;
textTimer.y = 28;
textTimer.depth = 30; // ignore the error here, this works.
this.addChild(textTimer);
function startTimer(){
    var timer = ct.timer.add(1000, 'second').then(() => {
        localTime -= 1;
        sessionTimer = localTime
        textTimer.text = (localTime).toString();
        if(localTime < 4){
            ct.sound.spawn("bzzt")
        }
        if(localTime > 0){
            startTimer();
        } else {
            ct.rooms.switch("Death")
        }
    })
    .catch(e => {
        console.log('Timer killed', e);
    });
}
startTimer();
ct.transition.slideIn(200, "left")
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room18'] = {
    name: 'Room18',
    group: 'Room 11-20',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":192,"y":360,"opacity":1,"tint":16777215,"scale":{"x":0.2,"y":0.2},"rotation":0,"exts":{},"customProperties":{},"template":"player"},{"x":-736,"y":363,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1.01},"rotation":0,"exts":{},"customProperties":{},"template":"enemy"},{"x":1211.82608678,"y":664.73913028,"opacity":1,"tint":16777215,"scale":{"x":0.34782609,"y":0.34782609},"rotation":0,"exts":{},"customProperties":{},"template":"heartIndicator"}]'),
    bgs: JSON.parse('[{"texture":"floor","depth":-20,"exts":{"movementX":0,"movementY":0,"parallaxX":0,"parallaxY":0,"repeat":"repeat","scaleX":1.5,"scaleY":1.5,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[{"depth":500,"tiles":[{"texture":"spritsheet","frame":1,"x":1248,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":16777215}],"extends":{"cgroup":"ExitDoor"}},{"depth":500,"tiles":[{"texture":"time","frame":0,"x":57.3030303,"y":51.55555556,"width":495,"height":396,"opacity":1,"rotation":0,"scale":{"x":0.2020202,"y":0.2020202},"tint":16777215}],"extends":{"cgroup":"Clock"}},{"depth":2,"tiles":[{"texture":"spritsheet","frame":0,"x":28,"y":664,"width":64,"height":64,"opacity":0,"rotation":0,"scale":{"x":1.625,"y":0.95},"tint":12566463}],"extends":{"cgroup":"Secret"}},{"depth":1,"tiles":[{"texture":"spritsheet","frame":0,"x":656,"y":32,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":400,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":-1,"y":10.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":160,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":0},{"texture":"spritsheet","frame":0,"x":656,"y":688,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":528,"y":464,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":8.5,"y":0.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":336,"y":144,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":8.5,"y":3.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":528,"y":336,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":2.5,"y":4.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":912,"y":272,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":3.5,"y":0.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1008,"y":464,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":0.5,"y":6.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":576,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":4},"tint":12566463}],"extends":{"cgroup":"Solid"}}]'),
    backgroundColor: '#000000',
    cameraConstraints: {"x1":1280,"y1":720,"x2":1280,"y2":720},
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room18 — core_OnRoomStart (On room start event) */
{
redPressed = false
bluePressed = false
greenPressed = false
if(sessionTimer == 0){
    sessionTimer = 30
}
if(glitchRoom != null){
        ct.rooms.remove(glitchRoom)
        glitchRoom = null
    }
if(Math.round(ct.random(10)) == 4){
    glitchRoom = ct.rooms.append('glitch');
}
var localTime = sessionTimer;
var textTimer = new PIXI.Text(localTime.toString(), ct.styles.get('MainStyle'));
textTimer.x = 96;
textTimer.y = 28;
textTimer.depth = 30; // ignore the error here, this works.
this.addChild(textTimer);
function startTimer(){
    var timer = ct.timer.add(1000, 'second').then(() => {
        localTime -= 1;
        sessionTimer = localTime
        textTimer.text = (localTime).toString();
        if(localTime < 4){
            ct.sound.spawn("bzzt")
        }
        if(localTime > 0){
            startTimer();
        } else {
            ct.rooms.switch("Death")
        }
    })
    .catch(e => {
        console.log('Timer killed', e);
    });
}
startTimer();
ct.transition.slideIn(200, "left")
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room19'] = {
    name: 'Room19',
    group: 'Room 11-20',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":192,"y":360,"opacity":1,"tint":16777215,"scale":{"x":0.2,"y":0.2},"rotation":0,"exts":{},"customProperties":{},"template":"player"},{"x":-736,"y":363,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1.01},"rotation":0,"exts":{},"customProperties":{},"template":"enemy"},{"x":1211.82608678,"y":664.73913028,"opacity":1,"tint":16777215,"scale":{"x":0.34782609,"y":0.34782609},"rotation":0,"exts":{},"customProperties":{},"template":"heartIndicator"},{"x":864,"y":256,"opacity":1,"tint":16777215,"scale":{"x":0.0625,"y":0.375},"rotation":0,"exts":{},"customProperties":{},"template":"redwall"},{"x":448,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":3.141592653589793,"exts":{},"customProperties":{},"template":"greenButton"},{"x":0,"y":448,"opacity":1,"tint":16777215,"scale":{"x":1.6875,"y":0.0625},"rotation":0,"exts":{},"customProperties":{},"template":"greenwall"},{"x":448,"y":640,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":0,"exts":{},"customProperties":{},"template":"blueButton"},{"x":864,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.0625,"y":0.375},"rotation":0,"exts":{},"customProperties":{},"template":"bluewall"},{"x":1216,"y":144,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":-1.5707963267948966,"exts":{},"customProperties":{"newProperty1":""},"template":"redButton"}]'),
    bgs: JSON.parse('[{"texture":"floor","depth":-20,"exts":{"movementX":0,"movementY":0,"parallaxX":0,"parallaxY":0,"repeat":"repeat","scaleX":1.5,"scaleY":1.5,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[{"depth":500,"tiles":[{"texture":"spritsheet","frame":1,"x":1248,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":16777215}],"extends":{"cgroup":"ExitDoor"}},{"depth":500,"tiles":[{"texture":"time","frame":0,"x":57.3030303,"y":51.55555556,"width":495,"height":396,"opacity":1,"rotation":0,"scale":{"x":0.2020202,"y":0.2020202},"tint":16777215}],"extends":{"cgroup":"Clock"}},{"depth":499,"tiles":[],"extends":{"cgroup":"Nothing"}},{"depth":432,"tiles":[],"extends":{"cgroup":"Pant"}},{"depth":2,"tiles":[{"texture":"spritsheet","frame":0,"x":28,"y":664,"width":64,"height":64,"opacity":0,"rotation":0,"scale":{"x":1.625,"y":0.95},"tint":12566463}],"extends":{"cgroup":"Secret"}},{"depth":1,"tiles":[{"texture":"spritsheet","frame":0,"x":656,"y":32,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":400,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":-1,"y":10.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":160,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":0},{"texture":"spritsheet","frame":0,"x":656,"y":688,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1008,"y":560,"width":64,"height":64,"opacity":1,"rotation":1.5707963267948966,"scale":{"x":3.5,"y":4.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1072,"y":240,"width":64,"height":64,"opacity":1,"rotation":1.5707963267948966,"scale":{"x":0.5,"y":5.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":576,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":4},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1168,"y":560,"width":64,"height":64,"opacity":1,"rotation":1.5707963267948966,"scale":{"x":3.5,"y":1.5},"tint":12566463}],"extends":{"cgroup":"Solid"}}]'),
    backgroundColor: '#000000',
    cameraConstraints: {"x1":1280,"y1":720,"x2":1280,"y2":720},
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room19 — core_OnRoomStart (On room start event) */
{
redPressed = false
bluePressed = false
greenPressed = false
if(sessionTimer == 0){
    sessionTimer = 30
}
if(glitchRoom != null){
        ct.rooms.remove(glitchRoom)
        glitchRoom = null
    }
if(Math.round(ct.random(10)) == 4){
    glitchRoom = ct.rooms.append('glitch');
}
var localTime = sessionTimer;
var textTimer = new PIXI.Text(localTime.toString(), ct.styles.get('MainStyle'));
textTimer.x = 96;
textTimer.y = 28;
textTimer.depth = 30; // ignore the error here, this works.
this.addChild(textTimer);
function startTimer(){
    var timer = ct.timer.add(1000, 'second').then(() => {
        localTime -= 1;
        sessionTimer = localTime
        textTimer.text = (localTime).toString();
        if(localTime < 4){
            ct.sound.spawn("bzzt")
        }
        if(localTime > 0){
            startTimer();
        } else {
            ct.rooms.switch("Death")
        }
    })
    .catch(e => {
        console.log('Timer killed', e);
    });
}
startTimer();
ct.transition.slideIn(200, "left")
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room20'] = {
    name: 'Room20',
    group: 'Room 11-20',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":192,"y":360,"opacity":1,"tint":16777215,"scale":{"x":0.2,"y":0.2},"rotation":0,"exts":{},"customProperties":{},"template":"player"},{"x":-736,"y":363,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1.01},"rotation":0,"exts":{},"customProperties":{},"template":"enemy"},{"x":1211.82608678,"y":664.73913028,"opacity":1,"tint":16777215,"scale":{"x":0.34782609,"y":0.34782609},"rotation":0,"exts":{},"customProperties":{},"template":"heartIndicator"}]'),
    bgs: JSON.parse('[{"texture":"floor","depth":-20,"exts":{"movementX":0,"movementY":0,"parallaxX":0,"parallaxY":0,"repeat":"repeat","scaleX":1.5,"scaleY":1.5,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[{"depth":500,"tiles":[{"texture":"spritsheet","frame":1,"x":1248,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":16777215}],"extends":{"cgroup":"ExitDoor"}},{"depth":500,"tiles":[{"texture":"time","frame":0,"x":57.3030303,"y":51.55555556,"width":495,"height":396,"opacity":1,"rotation":0,"scale":{"x":0.2020202,"y":0.2020202},"tint":16777215}],"extends":{"cgroup":"Clock"}},{"depth":2,"tiles":[{"texture":"spritsheet","frame":0,"x":28,"y":664,"width":64,"height":64,"opacity":0,"rotation":0,"scale":{"x":1.625,"y":0.95},"tint":12566463}],"extends":{"cgroup":"Secret"}},{"depth":1,"tiles":[{"texture":"spritsheet","frame":0,"x":656,"y":32,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":400,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":-1,"y":10.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":160,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":0},{"texture":"spritsheet","frame":0,"x":656,"y":688,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":336,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":0.5,"y":5.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":656,"y":200,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":0.5,"y":2.75},"tint":12566463},{"texture":"spritsheet","frame":0,"x":656,"y":520,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":0.5,"y":2.75},"tint":12566463},{"texture":"spritsheet","frame":0,"x":880,"y":448,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":0.5,"y":8},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1072,"y":192,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":0.5,"y":8},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":592,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":4.5},"tint":12566463}],"extends":{"cgroup":"Solid"}}]'),
    backgroundColor: '#000000',
    cameraConstraints: {"x1":1280,"y1":720,"x2":1280,"y2":720},
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room20 — core_OnRoomStart (On room start event) */
{
redPressed = false
bluePressed = false
greenPressed = false
if(sessionTimer == 0){
    sessionTimer = 30
}
if(glitchRoom != null){
        ct.rooms.remove(glitchRoom)
        glitchRoom = null
    }
if(Math.round(ct.random(10)) == 4){
    glitchRoom = ct.rooms.append('glitch');
}
var localTime = sessionTimer;
var textTimer = new PIXI.Text(localTime.toString(), ct.styles.get('MainStyle'));
textTimer.x = 96;
textTimer.y = 28;
textTimer.depth = 30; // ignore the error here, this works.
this.addChild(textTimer);
function startTimer(){
    var timer = ct.timer.add(1000, 'second').then(() => {
        localTime -= 1;
        sessionTimer = localTime
        textTimer.text = (localTime).toString();
        if(localTime < 4){
            ct.sound.spawn("bzzt")
        }
        if(localTime > 0){
            startTimer();
        } else {
            ct.rooms.switch("Death")
        }
    })
    .catch(e => {
        console.log('Timer killed', e);
    });
}
startTimer();
ct.transition.slideIn(200, "left")
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room21'] = {
    name: 'Room21',
    group: 'Room 21-30',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":192,"y":360,"opacity":1,"tint":16777215,"scale":{"x":0.2,"y":0.2},"rotation":0,"exts":{},"customProperties":{},"template":"player"},{"x":-736,"y":363,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1.01},"rotation":0,"exts":{},"customProperties":{},"template":"enemy"},{"x":1211.82608678,"y":664.73913028,"opacity":1,"tint":16777215,"scale":{"x":0.34782609,"y":0.34782609},"rotation":0,"exts":{},"customProperties":{},"template":"heartIndicator"}]'),
    bgs: JSON.parse('[{"texture":"floor","depth":-20,"exts":{"movementX":0,"movementY":0,"parallaxX":0,"parallaxY":0,"repeat":"repeat","scaleX":1.5,"scaleY":1.5,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[{"depth":500,"tiles":[{"texture":"spritsheet","frame":1,"x":1248,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":16777215}],"extends":{"cgroup":"ExitDoor"}},{"depth":500,"tiles":[{"texture":"time","frame":0,"x":57.3030303,"y":51.55555556,"width":495,"height":396,"opacity":1,"rotation":0,"scale":{"x":0.2020202,"y":0.2020202},"tint":16777215}],"extends":{"cgroup":"Clock"}},{"depth":2,"tiles":[{"texture":"spritsheet","frame":0,"x":28,"y":664,"width":64,"height":64,"opacity":0,"rotation":0,"scale":{"x":1.625,"y":0.95},"tint":12566463}],"extends":{"cgroup":"Secret"}},{"depth":1,"tiles":[{"texture":"spritsheet","frame":0,"x":656,"y":32,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":400,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":-1,"y":10.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":160,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":0},{"texture":"spritsheet","frame":0,"x":656,"y":688,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":336,"y":280,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":0.5,"y":7.25},"tint":12566463},{"texture":"spritsheet","frame":0,"x":944,"y":256,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":0.5,"y":7},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1104,"y":480,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":0.5,"y":6},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":592,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":4.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":432,"y":232,"width":64,"height":64,"opacity":1,"rotation":1.5707963267948966,"scale":{"x":0.5,"y":2.75},"tint":12566463},{"texture":"spritsheet","frame":0,"x":656,"y":448,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":0.5,"y":7},"tint":12566463},{"texture":"spritsheet","frame":0,"x":560,"y":424,"width":64,"height":64,"opacity":1,"rotation":1.5707963267948966,"scale":{"x":0.5,"y":2.75},"tint":12566463},{"texture":"spritsheet","frame":0,"x":752,"y":424,"width":64,"height":64,"opacity":1,"rotation":1.5707963267948966,"scale":{"x":0.5,"y":2.75},"tint":12566463},{"texture":"spritsheet","frame":0,"x":860,"y":232,"width":64,"height":64,"opacity":1,"rotation":1.5707963267948966,"scale":{"x":0.5,"y":2.125},"tint":12566463}],"extends":{"cgroup":"Solid"}}]'),
    backgroundColor: '#000000',
    cameraConstraints: {"x1":1280,"y1":720,"x2":1280,"y2":720},
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room21 — core_OnRoomStart (On room start event) */
{
redPressed = false
bluePressed = false
greenPressed = false
if(sessionTimer == 0){
    sessionTimer = 30
}
if(glitchRoom != null){
        ct.rooms.remove(glitchRoom)
        glitchRoom = null
    }
if(Math.round(ct.random(10)) == 4){
    glitchRoom = ct.rooms.append('glitch');
}
var localTime = sessionTimer;
var textTimer = new PIXI.Text(localTime.toString(), ct.styles.get('MainStyle'));
textTimer.x = 96;
textTimer.y = 28;
textTimer.depth = 30; // ignore the error here, this works.
this.addChild(textTimer);
var curRoom = parseInt(ct.room.name.replace('Room',''));
if((curRoom-1)/5 == Math.round((curRoom-1)/5)){
    this.textLabel = new PIXI.Text('Floor '+(((curRoom-1)/5)+1).toString()+'. RUN.', ct.styles.get('MainStyle')); 
    this.textLabel.x = 450;
    this.textLabel.y = 330;
    this.textLabel.depth = -12;
    this.addChild(this.textLabel);
}
function startTimer(){
    var timer = ct.timer.add(1000, 'second').then(() => {
        localTime -= 1;
        sessionTimer = localTime
        textTimer.text = (localTime).toString();
        if(localTime < 4){
            ct.sound.spawn("bzzt")
        }
        if(localTime > 0){
            startTimer();
        } else {
            ct.rooms.switch("Death")
        }
    })
    .catch(e => {
        console.log('Timer killed', e);
    });
}
startTimer();
ct.transition.slideIn(200, "left")
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room22'] = {
    name: 'Room22',
    group: 'Room 21-30',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":192,"y":360,"opacity":1,"tint":16777215,"scale":{"x":0.2,"y":0.2},"rotation":0,"exts":{},"customProperties":{},"template":"player"},{"x":-736,"y":363,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1.01},"rotation":0,"exts":{},"customProperties":{},"template":"enemy"},{"x":1211.82608678,"y":664.73913028,"opacity":1,"tint":16777215,"scale":{"x":0.34782609,"y":0.34782609},"rotation":0,"exts":{},"customProperties":{},"template":"heartIndicator"},{"x":416,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.0625,"y":1.1875},"rotation":0,"exts":{},"customProperties":{},"template":"bluewall"},{"x":192,"y":128,"opacity":1,"tint":16777215,"scale":{"x":0.5,"y":0.0625},"rotation":0,"exts":{},"customProperties":{},"template":"redwall"},{"x":192,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.0625,"y":0.1875},"rotation":0,"exts":{},"customProperties":{},"template":"redwall"},{"x":64,"y":544,"opacity":1,"tint":16777215,"scale":{"x":0.6875,"y":0.0625},"rotation":0,"exts":{},"customProperties":{},"template":"greenwall"},{"x":128,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":3.141592653589793,"exts":{},"customProperties":{},"template":"greenButton"},{"x":320,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":3.141592653589793,"exts":{},"customProperties":{},"template":"blueButton"},{"x":256,"y":640,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":0,"exts":{},"customProperties":{},"template":"redButton"}]'),
    bgs: JSON.parse('[{"texture":"floor","depth":-20,"exts":{"movementX":0,"movementY":0,"parallaxX":0,"parallaxY":0,"repeat":"repeat","scaleX":1.5,"scaleY":1.5,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[{"depth":500,"tiles":[{"texture":"spritsheet","frame":1,"x":1248,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":16777215}],"extends":{"cgroup":"ExitDoor"}},{"depth":500,"tiles":[{"texture":"time","frame":0,"x":57.3030303,"y":51.55555556,"width":495,"height":396,"opacity":1,"rotation":0,"scale":{"x":0.2020202,"y":0.2020202},"tint":16777215}],"extends":{"cgroup":"Clock"}},{"depth":2,"tiles":[{"texture":"spritsheet","frame":0,"x":28,"y":664,"width":64,"height":64,"opacity":0,"rotation":0,"scale":{"x":1.625,"y":0.95},"tint":12566463}],"extends":{"cgroup":"Secret"}},{"depth":1,"tiles":[{"texture":"spritsheet","frame":0,"x":656,"y":32,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":400,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":-1,"y":10.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":160,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":0},{"texture":"spritsheet","frame":0,"x":656,"y":688,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":592,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":4.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":656,"y":368,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":0.5,"y":5.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":976,"y":128,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":0.5,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":976,"y":576,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":0.5,"y":3},"tint":12566463}],"extends":{"cgroup":"Solid"}}]'),
    backgroundColor: '#000000',
    cameraConstraints: {"x1":1280,"y1":720,"x2":1280,"y2":720},
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room22 — core_OnRoomStart (On room start event) */
{
redPressed = false
bluePressed = false
greenPressed = false
if(sessionTimer == 0){
    sessionTimer = 30
}
if(glitchRoom != null){
        ct.rooms.remove(glitchRoom)
        glitchRoom = null
    }
if(Math.round(ct.random(10)) == 4){
    glitchRoom = ct.rooms.append('glitch');
}
var localTime = sessionTimer;
var textTimer = new PIXI.Text(localTime.toString(), ct.styles.get('MainStyle'));
textTimer.x = 96;
textTimer.y = 28;
textTimer.depth = 30; // ignore the error here, this works.
this.addChild(textTimer);
function startTimer(){
    var timer = ct.timer.add(1000, 'second').then(() => {
        localTime -= 1;
        sessionTimer = localTime
        textTimer.text = (localTime).toString();
        if(localTime < 4){
            ct.sound.spawn("bzzt")
        }
        if(localTime > 0){
            startTimer();
        } else {
            ct.rooms.switch("Death")
        }
    })
    .catch(e => {
        console.log('Timer killed', e);
    });
}
startTimer();
ct.transition.slideIn(200, "left")
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['RoomPant'] = {
    name: 'RoomPant',
    group: 'Secrets',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":192,"y":360,"opacity":1,"tint":16777215,"scale":{"x":0.2,"y":0.2},"rotation":0,"exts":{},"customProperties":{},"template":"player"}]'),
    bgs: JSON.parse('[{"texture":"floor","depth":-20,"exts":{"movementX":0,"movementY":0,"parallaxX":0,"parallaxY":0,"repeat":"repeat","scaleX":1,"scaleY":1,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[{"depth":500,"tiles":[{"texture":"glados","frame":0,"x":2478.46862155,"y":-43.96830454,"width":603,"height":600,"opacity":1,"rotation":0,"scale":{"x":-1.1885996699999999,"y":1.1885996699999999},"tint":16777215}],"extends":{"cgroup":"ExitDoor"}},{"depth":2,"tiles":[],"extends":{"cgroup":"Secret"}},{"depth":1,"tiles":[{"texture":"pan","frame":0,"x":384,"y":64,"width":603,"height":600,"opacity":1,"rotation":0,"scale":{"x":1,"y":1},"tint":16777215}],"extends":{"cgroup":"Solid"}}]'),
    backgroundColor: '#000000',
    
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room RoomPant — core_OnRoomStart (On room start event) */
{
this.textLabel = new PIXI.Text('pant', ct.styles.get('MainStyle')); 
this.textLabel.x = 150;
this.textLabel.y = 330;
this.textLabel.depth = 5000;
this.addChild(this.textLabel);
}

    },
    isUi: false,
    follow: 'player',
    extends: {}
}
        
ct.rooms.templates['Room23'] = {
    name: 'Room23',
    group: 'Room 21-30',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":192,"y":360,"opacity":1,"tint":16777215,"scale":{"x":0.2,"y":0.2},"rotation":0,"exts":{},"customProperties":{},"template":"player"},{"x":-736,"y":363,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1.01},"rotation":0,"exts":{},"customProperties":{},"template":"enemy"},{"x":1211.82608678,"y":664.73913028,"opacity":1,"tint":16777215,"scale":{"x":0.34782609,"y":0.34782609},"rotation":0,"exts":{},"customProperties":{},"template":"heartIndicator"},{"x":1088,"y":96,"opacity":1,"tint":16777215,"scale":{"x":0.0625,"y":1.1875},"rotation":0,"exts":{},"customProperties":{},"template":"bluewall"},{"x":160,"y":160,"opacity":1,"tint":16777215,"scale":{"x":0.6875,"y":0.0625},"rotation":0,"exts":{},"customProperties":{},"template":"redwall"},{"x":352,"y":80,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":3.141592653589793,"exts":{},"customProperties":{},"template":"blueButton"},{"x":992,"y":272,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":3.141592653589793,"exts":{},"customProperties":{},"template":"redButton"}]'),
    bgs: JSON.parse('[{"texture":"floor","depth":-20,"exts":{"movementX":0,"movementY":0,"parallaxX":0,"parallaxY":0,"repeat":"repeat","scaleX":1.5,"scaleY":1.5,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[{"depth":500,"tiles":[{"texture":"spritsheet","frame":1,"x":1248,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":16777215}],"extends":{"cgroup":"ExitDoor"}},{"depth":500,"tiles":[{"texture":"time","frame":0,"x":57.3030303,"y":51.55555556,"width":495,"height":396,"opacity":1,"rotation":0,"scale":{"x":0.2020202,"y":0.2020202},"tint":16777215}],"extends":{"cgroup":"Clock"}},{"depth":2,"tiles":[{"texture":"spritsheet","frame":0,"x":28,"y":664,"width":64,"height":64,"opacity":0,"rotation":0,"scale":{"x":1.625,"y":0.95},"tint":12566463}],"extends":{"cgroup":"Secret"}},{"depth":1,"tiles":[{"texture":"spritsheet","frame":0,"x":656,"y":32,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":400,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":-1,"y":10.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":896,"y":160,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":13,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":0},{"texture":"spritsheet","frame":0,"x":656,"y":584,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":4.25},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":592,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":4.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":144,"y":160,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":2.5,"y":3},"tint":12566463}],"extends":{"cgroup":"Solid"}}]'),
    backgroundColor: '#000000',
    cameraConstraints: {"x1":1280,"y1":720,"x2":1280,"y2":720},
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room23 — core_OnRoomStart (On room start event) */
{
redPressed = false
bluePressed = false
greenPressed = false
if(sessionTimer == 0){
    sessionTimer = 30
}
if(glitchRoom != null){
        ct.rooms.remove(glitchRoom)
        glitchRoom = null
    }
if(Math.round(ct.random(10)) == 4){
    glitchRoom = ct.rooms.append('glitch');
}
var localTime = sessionTimer;
var textTimer = new PIXI.Text(localTime.toString(), ct.styles.get('MainStyle'));
textTimer.x = 96;
textTimer.y = 28;
textTimer.depth = 30; // ignore the error here, this works.
this.addChild(textTimer);
function startTimer(){
    var timer = ct.timer.add(1000, 'second').then(() => {
        localTime -= 1;
        sessionTimer = localTime
        textTimer.text = (localTime).toString();
        if(localTime < 4){
            ct.sound.spawn("bzzt")
        }
        if(localTime > 0){
            startTimer();
        } else {
            ct.rooms.switch("Death")
        }
    })
    .catch(e => {
        console.log('Timer killed', e);
    });
}
startTimer();
ct.transition.slideIn(200, "left")
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room24'] = {
    name: 'Room24',
    group: 'Room 21-30',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":192,"y":360,"opacity":1,"tint":16777215,"scale":{"x":0.2,"y":0.2},"rotation":0,"exts":{},"customProperties":{},"template":"player"},{"x":-736,"y":363,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1.01},"rotation":0,"exts":{},"customProperties":{},"template":"enemy"},{"x":1211.82608678,"y":664.73913028,"opacity":1,"tint":16777215,"scale":{"x":0.34782609,"y":0.34782609},"rotation":0,"exts":{},"customProperties":{},"template":"heartIndicator"},{"x":1056,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.0625,"y":1.1875},"rotation":0,"exts":{},"customProperties":{},"template":"bluewall"},{"x":992,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.0625,"y":1.1875},"rotation":0,"exts":{},"customProperties":{},"template":"redwall"},{"x":1152,"y":32,"opacity":1,"tint":16777215,"scale":{"x":1.25,"y":0.0625},"rotation":1.5707963267948966,"exts":{},"customProperties":{},"template":"greenwall"},{"x":80,"y":160,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":1.5707963267948966,"exts":{},"customProperties":{},"template":"greenButton"},{"x":896,"y":80,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":3.141592653589793,"exts":{},"customProperties":{},"template":"blueButton"},{"x":512,"y":640,"opacity":1,"tint":16777215,"scale":{"x":0.5021097,"y":0.5021097},"rotation":0,"exts":{},"customProperties":{},"template":"redButton"}]'),
    bgs: JSON.parse('[{"texture":"floor","depth":-20,"exts":{"movementX":0,"movementY":0,"parallaxX":0,"parallaxY":0,"repeat":"repeat","scaleX":1.5,"scaleY":1.5,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[{"depth":500,"tiles":[{"texture":"spritsheet","frame":1,"x":1248,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":16777215}],"extends":{"cgroup":"ExitDoor"}},{"depth":500,"tiles":[{"texture":"time","frame":0,"x":57.3030303,"y":51.55555556,"width":495,"height":396,"opacity":1,"rotation":0,"scale":{"x":0.2020202,"y":0.2020202},"tint":16777215}],"extends":{"cgroup":"Clock"}},{"depth":2,"tiles":[{"texture":"spritsheet","frame":0,"x":28,"y":664,"width":64,"height":64,"opacity":0,"rotation":0,"scale":{"x":1.625,"y":0.95},"tint":12566463}],"extends":{"cgroup":"Secret"}},{"depth":1,"tiles":[{"texture":"spritsheet","frame":0,"x":656,"y":32,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":400,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":-1,"y":10.5},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":160,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":3},"tint":12566463},{"texture":"spritsheet","frame":0,"x":32,"y":352,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1,"y":3},"tint":0},{"texture":"spritsheet","frame":0,"x":656,"y":688,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":20.5,"y":1},"tint":12566463},{"texture":"spritsheet","frame":0,"x":1264,"y":592,"width":64,"height":64,"opacity":1,"rotation":0,"scale":{"x":1.5,"y":4.5},"tint":12566463}],"extends":{"cgroup":"Solid"}}]'),
    backgroundColor: '#000000',
    cameraConstraints: {"x1":1280,"y1":720,"x2":1280,"y2":720},
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room24 — core_OnRoomStart (On room start event) */
{
redPressed = false
bluePressed = false
greenPressed = false
if(sessionTimer == 0){
    sessionTimer = 30
}
if(glitchRoom != null){
        ct.rooms.remove(glitchRoom)
        glitchRoom = null
    }
if(Math.round(ct.random(10)) == 4){
    glitchRoom = ct.rooms.append('glitch');
}
var localTime = sessionTimer;
var textTimer = new PIXI.Text(localTime.toString(), ct.styles.get('MainStyle'));
textTimer.x = 96;
textTimer.y = 28;
textTimer.depth = 30; // ignore the error here, this works.
this.addChild(textTimer);
function startTimer(){
    var timer = ct.timer.add(1000, 'second').then(() => {
        localTime -= 1;
        sessionTimer = localTime
        textTimer.text = (localTime).toString();
        if(localTime < 4){
            ct.sound.spawn("bzzt")
        }
        if(localTime > 0){
            startTimer();
        } else {
            ct.rooms.switch("Death")
        }
    })
    .catch(e => {
        console.log('Timer killed', e);
    });
}
startTimer();
ct.transition.slideIn(200, "left")
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Paused'] = {
    name: 'Paused',
    group: 'ungrouped',
    width: 1280,
    height: 720,
    objects: JSON.parse('[]'),
    bgs: JSON.parse('[]'),
    tiles: JSON.parse('[{"depth":1,"tiles":[{"texture":"spritsheet","frame":2,"x":640,"y":368,"width":64,"height":64,"opacity":0.3,"rotation":0,"scale":{"x":20,"y":11.5},"tint":0}],"extends":{}}]'),
    backgroundColor: '#000000',
    
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        /* room Paused — core_OnRoomEnd (On room end event) */
{
if(this.soundGlitch){
    ct.sound.resume('glitch')
}
if(this.soundEnd){
    ct.sound.resume('bzzt2')
}
}

    },
    onCreate() {
        /* room Paused — core_OnRoomStart (On room start event) */
{
this.soundGlitch = false
this.soundEnd = false
ct.sound.stop('footsteps')
if(ct.sound.playing('glitch')){
    this.soundGlitch = true
    ct.sound.pause('glitch')
}
if(ct.sound.playing('bzzt2')){
    this.soundEnd = true
    ct.sound.pause('bzzt2')
}
this.paused = new PIXI.Text('Game paused.', ct.styles.get('MainStyle'));
this.paused.x = 510
this.paused.y = 335
this.paused.depth = 30
this.addChild(this.paused);
}

    },
    isUi: true,
    follow: false,
    extends: {}
}
        
ct.rooms.templates.CTTRANSITIONEMPTYROOM = {
    name: 'CTTRANSITIONEMPTYROOM',
    width: 1024,
    height: 1024,
    objects: [],
    bgs: [],
    tiles: [],
    onStep() {
        void 0;
    },
    onDraw() {
        void 0;
    },
    onLeave() {
        void 0;
    },
    onCreate() {
        void 0;
    }
};


/**
 * @namespace
 */
ct.styles = {
    types: { },
    /**
     * Creates a new style with a given name.
     * Technically, it just writes `data` to `ct.styles.types`
     */
    new(name, styleTemplate) {
        ct.styles.types[name] = styleTemplate;
        return styleTemplate;
    },
    /**
     * Returns a style of a given name. The actual behavior strongly depends on `copy` parameter.
     * @param {string} name The name of the style to load
     * @param {boolean|Object} [copy] If not set, returns the source style object.
     * Editing it will affect all new style calls.
     * When set to `true`, will create a new object, which you can safely modify
     * without affecting the source style.
     * When set to an object, this will create a new object as well,
     * augmenting it with given properties.
     * @returns {object} The resulting style
     */
    get(name, copy) {
        if (copy === true) {
            return ct.u.ext({}, ct.styles.types[name]);
        }
        if (copy) {
            return ct.u.ext(ct.u.ext({}, ct.styles.types[name]), copy);
        }
        return ct.styles.types[name];
    }
};

ct.styles.new(
    "MainStyle",
    {
    "fontFamily": "\"CTPROJFONTVCR_OSD_MONO\", \"VCR_OSD_MONO\", sans-serif",
    "fontSize": 48,
    "fontStyle": "normal",
    "fontWeight": "100",
    "align": "left",
    "lineJoin": "round",
    "lineHeight": 64.80000000000001,
    "fill": [
        "#FFFFFF",
        "#8A8A8A"
    ],
    "strokeThickness": 6,
    "stroke": "#000000"
});

ct.styles.new(
    "extra",
    {
    "fontFamily": "\"CTPROJFONTVCR_OSD_MONO\", \"VCR_OSD_MONO\", sans-serif",
    "fontSize": 18,
    "fontStyle": "normal",
    "fontWeight": "400",
    "lineJoin": "round",
    "lineHeight": 24.3,
    "fill": [
        "#FFFFFF",
        "#FFFFFF"
    ],
    "fillGradientType": 1,
    "strokeThickness": 2,
    "stroke": "#000000",
    "dropShadow": true,
    "dropShadowBlur": 10,
    "dropShadowColor": "#000000",
    "dropShadowAngle": 0,
    "dropShadowDistance": 0
});



/**
 * @typedef ISimplePoint
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef ITandemSettings
 *
 * @property {ISimplePoint} [scale] Optional scaling object with `x` and `y` parameters.
 * @property {ISimplePoint} [position] Set this to additionally shift the emitter tandem relative
 * to the copy it was attached to, or relative to the copy it follows.
 * @property {number} [prewarmDelay] Optional; if less than 0, it will prewarm the emitter tandem,
 * meaning that it will simulate a given number of seconds before
 * showing particles in the world. If greater than 0, will postpone
 * the effect for the specified number of seconds.
 * @property {number} [tint] Optional tint to the whole effect.
 * @property {number} [alpha] Optional opacity set to the whole effect.
 * @property {number} [rotation] Optional rotation in radians.
 * @property {number} [angle] Optional rotation in degrees.
 * @property {boolean} [isUi] If set to true, will use the time scale of UI layers. This affects
 * how an effect is simulated during slowmo effects and game pause.
 * @property {number} [depth] The depth of the tandem. Defaults to Infinity
 * (will overlay everything).
 * @property {Room} [room] The room to attach the effect to.
 * Defaults to the current main room (ct.room); has no effect if attached to a copy.
 */

/**
 * A class for displaying and managing a collection of particle emitters.
 *
 * @property {boolean} frozen If set to true, the tandem will stop updating its emitters
 * @property {Copy|DisplayObject} follow A copy to follow
 * @extends PIXI.Container
 */
class EmitterTandem extends PIXI.Container {
    /**
     * Creates a new emitter tandem. This method should not be called directly;
     * better use the methods of `ct.emitters`.
     * @param {object} tandemData The template object of the tandem, as it was exported from ct.IDE.
     * @param {ITandemSettings} opts Additional settings applied to the tandem
     * @constructor
     */
    constructor(tandemData, opts) {
        super();
        this.emitters = [];
        this.delayed = [];

        for (const emt of tandemData) {
            const inst = new PIXI.particles.Emitter(
                this,
                ct.res.getTexture(emt.texture),
                emt.settings
            );
            const d = emt.settings.delay + opts.prewarmDelay;
            if (d > 0) {
                inst.emit = false;
                this.delayed.push({
                    value: d,
                    emitter: inst
                });
            } else if (d < 0) {
                inst.emit = true;
                inst.update(-d);
            } else {
                inst.emit = true;
            }
            inst.initialDeltaPos = {
                x: emt.settings.pos.x,
                y: emt.settings.pos.y
            };
            this.emitters.push(inst);
            inst.playOnce(() => {
                this.emitters.splice(this.emitters.indexOf(inst), 1);
            });
        }
        this.isUi = opts.isUi;
        this.scale.x = opts.scale.x;
        this.scale.y = opts.scale.y;
        if (opts.rotation) {
            this.rotation = opts.rotation;
        } else if (opts.angle) {
            this.angle = opts.angle;
        }
        this.deltaPosition = opts.position;
        this.depth = opts.depth;
        this.frozen = false;

        if (this.isUi) {
            ct.emitters.uiTandems.push(this);
        } else {
            ct.emitters.tandems.push(this);
        }
    }
    /**
     * A method for internal use; advances the particle simulation further
     * according to either a UI ticker or ct.delta.
     * @returns {void}
     */
    update() {
        if (this.stopped) {
            for (const emitter of this.emitters) {
                if (!emitter.particleCount) {
                    this.emitters.splice(this.emitters.indexOf(emitter), 1);
                }
            }
        }
        // eslint-disable-next-line no-underscore-dangle
        if ((this.appendant && this.appendant._destroyed) || this.kill || !this.emitters.length) {
            this.emit('done');
            if (this.isUi) {
                ct.emitters.uiTandems.splice(ct.emitters.uiTandems.indexOf(this), 1);
            } else {
                ct.emitters.tandems.splice(ct.emitters.tandems.indexOf(this), 1);
            }
            this.destroy();
            return;
        }
        if (this.frozen) {
            return;
        }
        const s = (this.isUi ? PIXI.Ticker.shared.elapsedMS : PIXI.Ticker.shared.deltaMS) / 1000;
        for (const delayed of this.delayed) {
            delayed.value -= s;
            if (delayed.value <= 0) {
                delayed.emitter.emit = true;
                this.delayed.splice(this.delayed.indexOf(delayed), 1);
            }
        }
        for (const emt of this.emitters) {
            if (this.delayed.find(delayed => delayed.emitter === emt)) {
                continue;
            }
            emt.update(s);
        }
        if (this.follow) {
            this.updateFollow();
        }
    }
    /**
     * Stops spawning new particles, then destroys itself.
     * Can be fired only once, otherwise it will log a warning.
     * @returns {void}
     */
    stop() {
        if (this.stopped) {
            // eslint-disable-next-line no-console
            console.trace('[ct.emitters] An attempt to stop an already stopped emitter tandem. Continuing…');
            return;
        }
        this.stopped = true;
        for (const emt of this.emitters) {
            emt.emit = false;
        }
        this.delayed = [];
    }
    /**
     * Stops spawning new particles, but continues simulation and allows to resume the effect later
     * with `emitter.resume();`
     * @returns {void}
     */
    pause() {
        for (const emt of this.emitters) {
            if (emt.maxParticles !== 0) {
                emt.oldMaxParticles = emt.maxParticles;
                emt.maxParticles = 0;
            }
        }
    }
    /**
     * Resumes previously paused effect.
     * @returns {void}
     */
    resume() {
        for (const emt of this.emitters) {
            emt.maxParticles = emt.oldMaxParticles || emt.maxParticles;
        }
    }
    /**
     * Removes all the particles from the tandem, but continues spawning new ones.
     * @returns {void}
     */
    clear() {
        for (const emt of this.emitters) {
            emt.cleanup();
        }
    }

    updateFollow() {
        if (!this.follow) {
            return;
        }
        if (this.follow.kill || !this.follow.scale) {
            this.follow = null;
            this.stop();
            return;
        }
        const delta = ct.u.rotate(
            this.deltaPosition.x * this.follow.scale.x,
            this.deltaPosition.y * this.follow.scale.y,
            this.follow.angle
        );
        for (const emitter of this.emitters) {
            emitter.updateOwnerPos(this.follow.x + delta.x, this.follow.y + delta.y);
            const ownDelta = ct.u.rotate(
                emitter.initialDeltaPos.x * this.follow.scale.x,
                emitter.initialDeltaPos.y * this.follow.scale.y,
                this.follow.angle
            );
            emitter.updateSpawnPos(ownDelta.x, ownDelta.y);
        }
    }
}

(function emittersAddon() {
    const defaultSettings = {
        prewarmDelay: 0,
        scale: {
            x: 1,
            y: 1
        },
        tint: 0xffffff,
        alpha: 1,
        position: {
            x: 0,
            y: 0
        },
        isUi: false,
        depth: Infinity
    };

    /**
     * @namespace
     */
    ct.emitters = {
        /**
         * A map of existing emitter templates.
         * @type Array<object>
         */
        templates: [{
    "Tandem_F2tnF8": []
}][0] || {},
        /**
         * A list of all the emitters that are simulated in UI time scale.
         * @type Array<EmitterTandem>
         */
        uiTandems: [],
        /**
         * A list of all the emitters that are simulated in a regular game loop.
         * @type Array<EmitterTandem>
         */
        tandems: [],
        /**
         * Creates a new emitter tandem in the world at the given position.
         * @param {string} name The name of the tandem template, as it was named in ct.IDE.
         * @param {number} x The x coordinate of the new tandem.
         * @param {number} y The y coordinate of the new tandem.
         * @param {ITandemSettings} [settings] Additional configs for the created tandem.
         * @return {EmitterTandem} The newly created tandem.
         */
        fire(name, x, y, settings) {
            if (!(name in ct.emitters.templates)) {
                throw new Error(`[ct.emitters] An attempt to create a non-existent emitter ${name}.`);
            }
            const opts = Object.assign({}, defaultSettings, settings);
            const tandem = new EmitterTandem(ct.emitters.templates[name], opts);
            tandem.x = x;
            tandem.y = y;
            if (!opts.room) {
                ct.room.addChild(tandem);
                tandem.isUi = ct.room.isUi;
            } else {
                opts.room.addChild(tandem);
                tandem.isUi = opts.room.isUi;
            }
            return tandem;
        },
        /**
         * Creates a new emitter tandem and attaches it to the given copy
         * (or to any other DisplayObject).
         * @param {Copy|PIXI.DisplayObject} parent The parent of the created tandem.
         * @param {string} name The name of the tandem template.
         * @param {ITandemSettings} [settings] Additional options for the created tandem.
         * @returns {EmitterTandem} The newly created emitter tandem.
         */
        append(parent, name, settings) {
            if (!(name in ct.emitters.templates)) {
                throw new Error(`[ct.emitters] An attempt to create a non-existent emitter ${name}.`);
            }
            const opts = Object.assign({}, defaultSettings, settings);
            const tandem = new EmitterTandem(ct.emitters.templates[name], opts);
            if (opts.position) {
                tandem.x = opts.position.x;
                tandem.y = opts.position.y;
            }
            tandem.appendant = parent;
            parent.addChild(tandem);
            return tandem;
        },
        /**
         * Creates a new emitter tandem in the world, and configs it so it will follow a given copy.
         * This includes handling position, scale, and rotation.
         * @param {Copy|PIXI.DisplayObject} parent The copy to follow.
         * @param {string} name The name of the tandem template.
         * @param {ITandemSettings} [settings] Additional options for the created tandem.
         * @returns {EmitterTandem} The newly created emitter tandem.
         */
        follow(parent, name, settings) {
            if (!(name in ct.emitters.templates)) {
                throw new Error(`[ct.emitters] An attempt to create a non-existent emitter ${name}.`);
            }
            const opts = Object.assign({}, defaultSettings, settings);
            const tandem = new EmitterTandem(ct.emitters.templates[name], opts);
            tandem.follow = parent;
            tandem.updateFollow();
            if (!('getRoom' in parent)) {
                ct.room.addChild(tandem);
            } else {
                parent.getRoom().addChild(tandem);
            }
            return tandem;
        }
    };

    PIXI.Ticker.shared.add(() => {
        for (const tandem of ct.emitters.uiTandems) {
            tandem.update();
        }
        for (const tandem of ct.emitters.tandems) {
            tandem.update();
        }
    });
})();
/**
 * @extends {PIXI.AnimatedSprite}
 * @class
 * @property {string} template The name of the template from which the copy was created
 * @property {IShapeTemplate} shape The collision shape of a copy
 * @property {number} depth The relative position of a copy in a drawing stack.
 * Higher values will draw the copy on top of those with lower ones
 * @property {number} xprev The horizontal location of a copy in the previous frame
 * @property {number} yprev The vertical location of a copy in the previous frame
 * @property {number} xstart The starting location of a copy,
 * meaning the point where it was created — either by placing it in a room with ct.IDE
 * or by calling `ct.templates.copy`.
 * @property {number} ystart The starting location of a copy,
 * meaning the point where it was created — either by placing it in a room with ct.IDE
 * or by calling `ct.templates.copy`.
 * @property {number} hspeed The horizontal speed of a copy
 * @property {number} vspeed The vertical speed of a copy
 * @property {number} gravity The acceleration that pulls a copy at each frame
 * @property {number} gravityDir The direction of acceleration that pulls a copy at each frame
 * @property {number} depth The position of a copy in draw calls
 * @property {boolean} kill If set to `true`, the copy will be destroyed by the end of a frame.
 * @property {number} timer1 Time for the next run of the 1st timer, in seconds.
 * @property {number} timer2 Time for the next run of the 2nd timer, in seconds.
 * @property {number} timer3 Time for the next run of the 3rd timer, in seconds.
 * @property {number} timer4 Time for the next run of the 4th timer, in seconds.
 * @property {number} timer5 Time for the next run of the 5th timer, in seconds.
 * @property {number} timer6 Time for the next run of the 6th timer, in seconds.
 */
const Copy = (function Copy() {
    const textureAccessor = Symbol('texture');
    const zeroDirectionAccessor = Symbol('zeroDirection');
    const hspeedAccessor = Symbol('hspeed');
    const vspeedAccessor = Symbol('vspeed');
    let uid = 0;
    class Copy extends PIXI.AnimatedSprite {
        /**
         * Creates an instance of Copy.
         * @param {string} template The name of the template to copy
         * @param {number} [x] The x coordinate of a new copy. Defaults to 0.
         * @param {number} [y] The y coordinate of a new copy. Defaults to 0.
         * @param {object} [exts] An optional object with additional properties
         * that will exist prior to a copy's OnCreate event
         * @param {PIXI.DisplayObject|Room} [container] A container to set as copy's parent
         * before its OnCreate event. Defaults to ct.room.
         * @memberof Copy
         */
        // eslint-disable-next-line complexity, max-lines-per-function
        constructor(template, x, y, exts, container) {
            container = container || ct.room;
            var t;
            if (template) {
                if (!(template in ct.templates.templates)) {
                    throw new Error(`[ct.templates] An attempt to create a copy of a non-existent template \`${template}\` detected. A typo?`);
                }
                t = ct.templates.templates[template];
                if (t.texture && t.texture !== '-1') {
                    const textures = ct.res.getTexture(t.texture);
                    super(textures);
                    this[textureAccessor] = t.texture;
                    this.anchor.x = textures[0].defaultAnchor.x;
                    this.anchor.y = textures[0].defaultAnchor.y;
                } else {
                    const emptyRect = new PIXI.Rectangle(0, 0, t.width || 1, t.height || 1);
                    super([new PIXI.Texture(PIXI.Texture.EMPTY, emptyRect)]);
                    this.anchor.x = t.anchorX || 0;
                    this.anchor.y = t.anchorY || 0;
                }
                this.template = template;
                this.parent = container;
                this.blendMode = t.blendMode || PIXI.BLEND_MODES.NORMAL;
                this.loop = t.loopAnimation;
                this.animationSpeed = t.animationFPS / 60;
                if (t.visible === false) { // ignore nullish values
                    this.visible = false;
                }
                if (t.playAnimationOnStart) {
                    this.play();
                }
                if (t.extends) {
                    ct.u.ext(this, t.extends);
                }
            } else {
                super([PIXI.Texture.EMPTY]);
            }
            // it is defined in main.js
            // eslint-disable-next-line no-undef
            this[copyTypeSymbol] = true;
            this.position.set(x || 0, y || 0);
            this.xprev = this.xstart = this.x;
            this.yprev = this.ystart = this.y;
            this[hspeedAccessor] = 0;
            this[vspeedAccessor] = 0;
            this[zeroDirectionAccessor] = 0;
            this.speed = this.direction = this.gravity = 0;
            this.gravityDir = 90;
            this.depth = 0;
            this.timer1 = this.timer2 = this.timer3 = this.timer4 = this.timer5 = this.timer6 = 0;
            if (exts) {
                ct.u.ext(this, exts);
                if (exts.scaleX) {
                    this.scale.x = exts.scaleX;
                }
                if (exts.scaleY) {
                    this.scale.y = exts.scaleY;
                }
            }
            this.uid = ++uid;
            if (template) {
                ct.u.ext(this, {
                    template,
                    depth: t.depth,
                    onStep: t.onStep,
                    onDraw: t.onDraw,
                    onCreate: t.onCreate,
                    onDestroy: t.onDestroy,
                    shape: ct.res.getTextureShape(t.texture || -1)
                });
                if (exts && exts.depth !== void 0) {
                    this.depth = exts.depth;
                }
                if (ct.templates.list[template]) {
                    ct.templates.list[template].push(this);
                } else {
                    ct.templates.list[template] = [this];
                }
                this.onBeforeCreateModifier();
                ct.templates.templates[template].onCreate.apply(this);
            }
            return this;
        }

        /**
         * The name of the current copy's texture, or -1 for an empty texture.
         * @param {string} value The name of the new texture
         * @type {(string|number)}
         */
        set tex(value) {
            if (this[textureAccessor] === value) {
                return value;
            }
            var {playing} = this;
            this.textures = ct.res.getTexture(value);
            this[textureAccessor] = value;
            this.shape = ct.res.getTextureShape(value);
            this.anchor.x = this.textures[0].defaultAnchor.x;
            this.anchor.y = this.textures[0].defaultAnchor.y;
            if (playing) {
                this.play();
            }
            return value;
        }
        get tex() {
            return this[textureAccessor];
        }

        get speed() {
            return Math.hypot(this.hspeed, this.vspeed);
        }
        /**
         * The speed of a copy that is used in `this.move()` calls
         * @param {number} value The new speed value
         * @type {number}
         */
        set speed(value) {
            if (value === 0) {
                this[zeroDirectionAccessor] = this.direction;
                this.hspeed = this.vspeed = 0;
                return;
            }
            if (this.speed === 0) {
                const restoredDir = this[zeroDirectionAccessor];
                this[hspeedAccessor] = value * Math.cos(restoredDir * Math.PI / 180);
                this[vspeedAccessor] = value * Math.sin(restoredDir * Math.PI / 180);
                return;
            }
            var multiplier = value / this.speed;
            this.hspeed *= multiplier;
            this.vspeed *= multiplier;
        }
        get hspeed() {
            return this[hspeedAccessor];
        }
        set hspeed(value) {
            if (this.vspeed === 0 && value === 0) {
                this[zeroDirectionAccessor] = this.direction;
            }
            this[hspeedAccessor] = value;
            return value;
        }
        get vspeed() {
            return this[vspeedAccessor];
        }
        set vspeed(value) {
            if (this.hspeed === 0 && value === 0) {
                this[zeroDirectionAccessor] = this.direction;
            }
            this[vspeedAccessor] = value;
            return value;
        }
        get direction() {
            if (this.speed === 0) {
                return this[zeroDirectionAccessor];
            }
            return (Math.atan2(this.vspeed, this.hspeed) * 180 / Math.PI + 360) % 360;
        }
        /**
         * The moving direction of the copy, in degrees, starting with 0 at the right side
         * and going with 90 facing upwards, 180 facing left, 270 facing down.
         * This parameter is used by `this.move()` call.
         * @param {number} value New direction
         * @type {number}
         */
        set direction(value) {
            this[zeroDirectionAccessor] = value;
            if (this.speed > 0) {
                var speed = this.speed;
                this.hspeed = speed * Math.cos(value * Math.PI / 180);
                this.vspeed = speed * Math.sin(value * Math.PI / 180);
            }
            return value;
        }

        /**
         * Performs a movement step, reading such parameters as `gravity`, `speed`, `direction`.
         * @returns {void}
         */
        move() {
            if (this.gravity) {
                this.hspeed += this.gravity * ct.delta * Math.cos(this.gravityDir * Math.PI / 180);
                this.vspeed += this.gravity * ct.delta * Math.sin(this.gravityDir * Math.PI / 180);
            }
            this.x += this.hspeed * ct.delta;
            this.y += this.vspeed * ct.delta;
        }
        /**
         * Adds a speed vector to the copy, accelerating it by a given delta speed
         * in a given direction.
         * @param {number} spd Additive speed
         * @param {number} dir The direction in which to apply additional speed
         * @returns {void}
         */
        addSpeed(spd, dir) {
            this.hspeed += spd * Math.cos(dir * Math.PI / 180);
            this.vspeed += spd * Math.sin(dir * Math.PI / 180);
        }

        /**
         * Returns the room that owns the current copy
         * @returns {Room} The room that owns the current copy
         */
        getRoom() {
            let parent = this.parent;
            while (!(parent instanceof Room)) {
                parent = parent.parent;
            }
            return parent;
        }

        // eslint-disable-next-line class-methods-use-this
        onBeforeCreateModifier() {
            // Filled by ct.IDE and catmods
            
        }
    }
    return Copy;
})();

(function ctTemplateAddon(ct) {
    const onCreateModifier = function () {
        this.$chashes = ct.place.getHashes(this);
for (const hash of this.$chashes) {
    if (!(hash in ct.place.grid)) {
        ct.place.grid[hash] = [this];
    } else {
        ct.place.grid[hash].push(this);
    }
}
if ([false][0] && this instanceof ct.templates.Copy) {
    this.$cDebugText = new PIXI.Text('Not initialized', {
        fill: 0xffffff,
        dropShadow: true,
        dropShadowDistance: 2,
        fontSize: [][0] || 16
    });
    this.$cDebugCollision = new PIXI.Graphics();
    this.addChild(this.$cDebugCollision, this.$cDebugText);
}

    };

    /**
     * An object with properties and methods for manipulating templates and copies,
     * mainly for finding particular copies and creating new ones.
     * @namespace
     */
    ct.templates = {
        Copy,
        /**
         * An object that contains arrays of copies of all templates.
         * @type {Object.<string,Array<Copy>>}
         */
        list: {
            BACKGROUND: [],
            TILEMAP: []
        },
        /**
         * A map of all the templates of templates exported from ct.IDE.
         * @type {object}
         */
        templates: { },
        /**
         * Creates a new copy of a given template inside a specific room.
         * @param {string} template The name of the template to use
         * @param {number} [x] The x coordinate of a new copy. Defaults to 0.
         * @param {number} [y] The y coordinate of a new copy. Defaults to 0.
         * @param {Room} [room] The room to which add the copy.
         * Defaults to the current room.
         * @param {object} [exts] An optional object which parameters will be applied
         * to the copy prior to its OnCreate event.
         * @returns {Copy} the created copy.
         */
        copyIntoRoom(template, x = 0, y = 0, room, exts) {
            // An advanced constructor. Returns a Copy
            if (!room || !(room instanceof Room)) {
                throw new Error(`Attempt to spawn a copy of template ${template} inside an invalid room. Room's value provided: ${room}`);
            }
            const obj = new Copy(template, x, y, exts);
            room.addChild(obj);
            ct.stack.push(obj);
            onCreateModifier.apply(obj);
            return obj;
        },
        /**
         * Creates a new copy of a given template inside the current root room.
         * A shorthand for `ct.templates.copyIntoRoom(template, x, y, ct.room, exts)`
         * @param {string} template The name of the template to use
         * @param {number} [x] The x coordinate of a new copy. Defaults to 0.
         * @param {number} [y] The y coordinate of a new copy. Defaults to 0.
         * @param {object} [exts] An optional object which parameters will be applied
         * to the copy prior to its OnCreate event.
         * @returns {Copy} the created copy.
         */
        copy(template, x = 0, y = 0, exts) {
            return ct.templates.copyIntoRoom(template, x, y, ct.room, exts);
        },
        /**
         * Applies a function to each copy in the current room
         * @param {Function} func The function to apply
         * @returns {void}
         */
        each(func) {
            for (const copy of ct.stack) {
                if (!(copy instanceof Copy)) {
                    continue; // Skip backgrounds and tile layers
                }
                func.apply(copy, this);
            }
        },
        /**
         * Applies a function to a given object (e.g. to a copy)
         * @param {Copy} obj The copy to perform function upon.
         * @param {Function} function The function to be applied.
         */
        withCopy(obj, func) {
            func.apply(obj, this);
        },
        /**
         * Applies a function to every copy of the given template name
         * @param {string} template The name of the template to perform function upon.
         * @param {Function} function The function to be applied.
         */
        withTemplate(template, func) {
            for (const copy of ct.templates.list[template]) {
                func.apply(copy, this);
            }
        },
        /**
         * Checks whether there are any copies of this template's name.
         * Will throw an error if you pass an invalid template name.
         * @param {string} template The name of a template to check.
         * @returns {boolean} Returns `true` if at least one copy exists in a room;
         * `false` otherwise.
         */
        exists(template) {
            if (!(template in ct.templates.templates)) {
                throw new Error(`[ct.templates] ct.templates.exists: There is no such template ${template}.`);
            }
            return ct.templates.list[template].length > 0;
        },
        /*
         * ⚠ Actual typings for this is in src\typedefs\ct.js\ct.templates.d.ts ⚠
         * Checks whether a given object exists in game's world.
         * Intended to be applied to copies, but may be used with other PIXI entities.
         * @param {Copy|PIXI.DisplayObject|any} obj The copy which existence needs to be checked.
         * @returns {boolean} Returns `true` if a copy exists; `false` otherwise.
         */
        valid(obj) {
            if (obj instanceof Copy) {
                return !obj.kill;
            }
            if (obj instanceof PIXI.DisplayObject) {
                return Boolean(obj.position);
            }
            return Boolean(obj);
        },
        /*
         * ⚠ Actual typings for this is in src\typedefs\ct.js\ct.templates.d.ts ⚠
         * Checks whether a given object is a ct.js copy.
         * @param {any} obj The object which needs to be checked.
         * @returns {boolean} Returns `true` if the passed object is a copy; `false` otherwise.
         */
        isCopy(obj) {
            return obj instanceof Copy;
        }
    };

    
ct.templates.templates["player"] = {
    depth: 2,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 0,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "playerTexture",
    onStep: function () {
        /* template player — core_OnStep (On frame start event) */
{
if(Math.abs(ct.actions.MoveX.value) > 0.2){
    this.hspeed = (8*playerSpeedMultiplier) * ct.actions.MoveX.value;
} else {this.hspeed=0}
if(Math.abs(ct.actions.MoveY.value) > 0.2){
    this.vspeed = (8*playerSpeedMultiplier) * ct.actions.MoveY.value;
} else {this.vspeed=0}
this.moveContinuousByAxes("Solid");
if (ct.actions.Pause.pressed) {
    if (!ct.room.paused) {
        ct.room.paused = true;
        ct.pixiApp.ticker.speed = 0;
        this.pauseRoom = ct.rooms.append('Paused')
    } else {
        ct.room.paused = false;
        ct.pixiApp.ticker.speed = 1;
        ct.rooms.remove(this.pauseRoom)
    }
}
if(!ct.room.paused){
    if(this.hspeed == 0 && this.vspeed == 0){
        ct.sound.stop('footsteps')
    } else {
        if(!ct.sound.playing('footsteps')){
            ct.sound.spawn('footsteps',{loop:true})
        }
    }
    if (ct.place.occupied(this, 'ExitDoor')){
        if(!this.exited){
            this.exited = true
            if(glitchRoom != null){
                ct.rooms.remove(glitchRoom)
                glitchRoom = null
            }
            var curRoom = parseInt(ct.room.name.replace('Room','')); // more weird ctjs functions that exist but arent recognized...
            ct.transition.slideOut(200, "left").then(()=>{
                if((curRoom/5) == Math.round(curRoom/5)){
                    if(curRoom == 25){
                        ct.rooms.switch('Ending')
                    } else {
                        inRoom = curRoom
                        ct.rooms.switch('Timemart');
                    }
                } else {
                    ct.rooms.switch("Room" + (curRoom+1).toString())
                }
            })
        }
    }
    if (ct.place.occupied(this, 'Secret') && ct.actions.Secret.down){
        ct.rooms.switch("RoomSecret")
    }
    if (ct.place.occupied(this, 'Pant')){
        ct.rooms.switch("RoomPant")
    }
}
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template player — core_OnCreate (On create event) */
{
this.exited = false
ct.room.paused = false
if(campyEnabled){
    this.gotoAndStop(0)
} else {
    this.gotoAndStop(1)
}
}

    },
    extends: {
    "cgroup": "Player"
}
};
ct.templates.list['player'] = [];
        
ct.templates.templates["enemy"] = {
    depth: 5,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "RAAHHHH",
    onStep: function () {
        /* template enemy — core_OnStep (On frame start event) */
{
this.hspeed = 1.6*monsterSpeedMultiplier
this.move();
}
/* template enemy — place_collisionCGroup (Collision with a group event) */
{
    const other = ct.place.occupied(this, 'Player');
    if (ct.templates.valid(other)) {
        if(glitchRoom != null){
        ct.rooms.remove(glitchRoom)
        glitchRoom = null
    }
if(extraLife){
    if(ct.room.name == "Room25"){
        this.x -= 750
        extraLife = false
    } else {
        ct.rooms.restart()
        sessionTimer += 5
        extraLife = false
        ct.sound.spawn('revive')
    }
} else {
    ct.rooms.switch("Death")
}
    }
}


    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {
    "cgroup": "Enemy"
}
};
ct.templates.list['enemy'] = [];
        
ct.templates.templates["vuile_sodemiet"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "vuile_sodemiet",
    onStep: function () {
        /* template vuile_sodemiet — core_OnStep (On frame start event) */
{
//Nee, jij krijgt een enkeltje naar de RIJSTVELDEN, jij vuilde sodemiet!
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {}
};
ct.templates.list['vuile_sodemiet'] = [];
        
ct.templates.templates["JUMPSCARE"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "jumpscare",
    onStep: function () {
        /* template JUMPSCARE — core_OnStep (On frame start event) */
{
this.vspeed = 2
this.move();
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {}
};
ct.templates.list['JUMPSCARE'] = [];
        
ct.templates.templates["powerups"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "powerups",
    onStep: function () {
        /* template powerups — core_OnStep (On frame start event) */
{
this.move();
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {}
};
ct.templates.list['powerups'] = [];
        
ct.templates.templates["monsterSpeed"] = {
    depth: 5,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "monsterSpeed",
    onStep: function () {
        
    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template monsterSpeed — core_OnPointerClick (OnPointerClick event) */
this.interactive = true;
this.on('pointertap', () => {
    
var numbers = [0.5, 1.0, 2.0]
var cur = numbers.indexOf(monsterSpeedMultiplier)

cur = cur + 1
if(cur > numbers.length-1){
    cur = 0
}
monsterSpeedMultiplier = numbers[cur]
if(cur == 0){
    time -= 15
} else if(cur == 1){
    time += 5
} else if(cur == 2){
    time += 10
}
ct.room.theTime.text = time
ct.room.monsterSpeed.text = numbers[cur] + "x"

});
/* template monsterSpeed — core_OnPointerEnter (OnPointerEnter event) */
this.interactive = true;
this.on('pointerover', () => {
    
ct.room.description.text = "Monster Speed"

});
/* template monsterSpeed — core_OnPointerLeave (OnPointerLeave event) */
this.interactive = true;
this.on('pointerout', () => {
    
ct.room.description.text = ""

});

    },
    extends: {}
};
ct.templates.list['monsterSpeed'] = [];
        
ct.templates.templates["playerSpeed"] = {
    depth: 5,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "playerSpeed",
    onStep: function () {
        
    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template playerSpeed — core_OnPointerClick (OnPointerClick event) */
this.interactive = true;
this.on('pointertap', () => {
    
var numbers = [0.7, 1.0, 1.5]
var cur = numbers.indexOf(playerSpeedMultiplier)

cur = cur + 1
if(cur > numbers.length-1){
    cur = 0
}
playerSpeedMultiplier = numbers[cur]
if(cur == 0){
    time += 18
} else if(cur == 1){
    time -= 8
} else if(cur == 2){
    time -= 10
}
ct.room.theTime.text = time
ct.room.playerSpeed.text = numbers[cur] + "x"


});
/* template playerSpeed — core_OnPointerEnter (OnPointerEnter event) */
this.interactive = true;
this.on('pointerover', () => {
    
ct.room.description.text = "Player Speed"

});
/* template playerSpeed — core_OnPointerLeave (OnPointerLeave event) */
this.interactive = true;
this.on('pointerout', () => {
    
ct.room.description.text = ""

});

    },
    extends: {}
};
ct.templates.list['playerSpeed'] = [];
        
ct.templates.templates["extraLife"] = {
    depth: 5,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "extraLife",
    onStep: function () {
        
    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template extraLife — core_OnPointerClick (OnPointerClick event) */
this.interactive = true;
this.on('pointertap', () => {
    
var numbers = [false, true]
var cur = numbers.indexOf(extraLife)

cur = cur + 1
if(cur > numbers.length-1){
    cur = 0
}
extraLife = numbers[cur]
if(cur == 0){
    time += 7
} else if(cur == 1 || cur == 2){
    time -= 7
}
ct.room.theTime.text = time
ct.room.extraLife.text = numbers[cur].toString().toUpperCase()

});
/* template extraLife — core_OnPointerEnter (OnPointerEnter event) */
this.interactive = true;
this.on('pointerover', () => {
    
ct.room.description.text = "Extra Life"

});
/* template extraLife — core_OnPointerLeave (OnPointerLeave event) */
this.interactive = true;
this.on('pointerout', () => {
    
ct.room.description.text = ""

});

    },
    extends: {}
};
ct.templates.list['extraLife'] = [];
        
ct.templates.templates["heartIndicator"] = {
    depth: 400,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "extraLife",
    onStep: function () {
        /* template heartIndicator — core_OnStep (On frame start event) */
{
this.move();
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template heartIndicator — core_OnCreate (On create event) */
{
if(extraLife){
    this.visible = true
} else {
    this.visible = false
}
}

    },
    extends: {}
};
ct.templates.list['heartIndicator'] = [];
        
ct.templates.templates["continue"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "continue",
    onStep: function () {
        /* template continue — core_OnStep (On frame start event) */
{
this.move();
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template continue — core_OnPointerClick (OnPointerClick event) */
this.interactive = true;
this.on('pointertap', () => {
    
if(ct.actions.Campy.down){
    campyEnabled = true
}
ct.rooms.switch("Room" + (inRoom+1))

});
/* template continue — core_OnCreate (On create event) */
{
campyEnabled = false
}

    },
    extends: {}
};
ct.templates.list['continue'] = [];
        
ct.templates.templates["blueButton"] = {
    depth: 1,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 0,
    playAnimationOnStart: false,
    loopAnimation: false,
    visible: true,
    group: "ungrouped",
    texture: "blueButton",
    onStep: function () {
        /* template blueButton — place_collisionCGroup (Collision with a group event) */
{
    const other = ct.place.occupied(this, 'Player');
    if (ct.templates.valid(other)) {
        if(!bluePressed){
    bluePressed = true
}
    }
}


    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {
    "cgroup": "Buttons"
}
};
ct.templates.list['blueButton'] = [];
        
ct.templates.templates["bluewall"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 0,
    playAnimationOnStart: false,
    loopAnimation: false,
    visible: true,
    group: "ungrouped",
    texture: "blueWall",
    onStep: function () {
        /* template bluewall — core_OnStep (On frame start event) */
{
if(bluePressed == false){
    this.visible = true
} else {
    this.height = 0
    this.width = 0
}
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {
    "cgroup": "Solid"
}
};
ct.templates.list['bluewall'] = [];
        
ct.templates.templates["redButton"] = {
    depth: 1,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 0,
    playAnimationOnStart: false,
    loopAnimation: false,
    visible: true,
    group: "ungrouped",
    texture: "redButton",
    onStep: function () {
        /* template redButton — place_collisionCGroup (Collision with a group event) */
{
    const other = ct.place.occupied(this, 'Player');
    if (ct.templates.valid(other)) {
        if(!redPressed){
    redPressed = true
}
    }
}


    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {
    "cgroup": "RedButton"
}
};
ct.templates.list['redButton'] = [];
        
ct.templates.templates["redwall"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 0,
    playAnimationOnStart: false,
    loopAnimation: false,
    visible: true,
    group: "ungrouped",
    texture: "redWall",
    onStep: function () {
        /* template redwall — core_OnStep (On frame start event) */
{
if(redPressed == false){
    this.visible = true
} else {
    this.height = 0
    this.width = 0
}
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {
    "cgroup": "Solid"
}
};
ct.templates.list['redwall'] = [];
        
ct.templates.templates["greenwall"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 0,
    playAnimationOnStart: false,
    loopAnimation: false,
    visible: true,
    group: "ungrouped",
    texture: "greenWall",
    onStep: function () {
        /* template greenwall — core_OnStep (On frame start event) */
{
if(greenPressed == false){
    this.visible = true
} else {
    this.height = 0
    this.width = 0
}
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {
    "cgroup": "Solid"
}
};
ct.templates.list['greenwall'] = [];
        
ct.templates.templates["greenButton"] = {
    depth: 1,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 0,
    playAnimationOnStart: false,
    loopAnimation: false,
    visible: true,
    group: "ungrouped",
    texture: "greenButton",
    onStep: function () {
        /* template greenButton — place_collisionCGroup (Collision with a group event) */
{
    const other = ct.place.occupied(this, 'Player');
    if (ct.templates.valid(other)) {
        if(!greenPressed){
    greenPressed = true
}
    }
}


    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {
    "cgroup": "RedButton"
}
};
ct.templates.list['greenButton'] = [];
        
ct.templates.templates["startBtn"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "startBtn",
    onStep: function () {
        
    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template startBtn — core_OnPointerClick (OnPointerClick event) */
this.interactive = true;
this.on('pointertap', () => {
    
ct.transition.fadeOut(2000).then(()=>{
    inRoom = 0
    ct.sound.stop('menu_jingle')
    ct.rooms.switch('guide')
})

});

    },
    extends: {}
};
ct.templates.list['startBtn'] = [];
        
ct.templates.templates["glitch"] = {
    depth: 50,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 15,
    playAnimationOnStart: true,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "GLITCH_SPRITESHEET",
    onStep: function () {
        /* template glitch — core_OnStep (On frame start event) */
{
this.move();
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template glitch — core_OnCreate (On create event) */
{
if(!ct.sound.playing('glitch')){
    ct.sound.spawn('glitch')
}
}

    },
    extends: {}
};
ct.templates.list['glitch'] = [];
        
ct.templates.templates["easyMode"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 0,
    playAnimationOnStart: false,
    loopAnimation: false,
    visible: true,
    group: "ungrouped",
    texture: "easyMode",
    onStep: function () {
        /* template easyMode — core_OnStep (On frame start event) */
{
this.move();
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template easyMode — core_OnPointerClick (OnPointerClick event) */
this.interactive = true;
this.on('pointertap', () => {
    
if(easyMode){
    this.gotoAndStop(0)
    easyMode = false
} else {
    this.gotoAndStop(1)
    easyMode = true
}

});
/* template easyMode — core_OnCreate (On create event) */
{
if(this.currentFrame == 0){
    easyMode = false
} else {
    easyMode = true
}
}

    },
    extends: {}
};
ct.templates.list['easyMode'] = [];
        
    (function vkeysTemplates() {
    ct.templates.templates.VKEY = {
        onStep: function () {
            var down = false,
                hover = false;
            if (ct.mouse) {
                if (ct.mouse.hoversUi(this)) {
                    hover = true;
                    if (ct.mouse.down) {
                        down = true;
                    }
                }
            }
            if (ct.touch) {
                for (const touch of ct.touch.events) {
                    if (ct.touch.collideUi(this, touch.id)) {
                        down = hover = true;
                        break;
                    }
                }
            }
            if (ct.pointer) {
                if (ct.pointer.hoversUi(this)) {
                    hover = true;
                    if (ct.pointer.collidesUi(this)) {
                        down = true;
                    }
                }
            }

            if (down) {
                this.tex = this.opts.texActive || this.opts.texNormal;
                ct.inputs.registry['vkeys.' + this.opts.key] = 1;
            } else {
                ct.inputs.registry['vkeys.' + this.opts.key] = 0;
                if (hover) {
                    this.tex = this.opts.texHover || this.opts.texNormal;
                } else {
                    this.tex = this.opts.texNormal;
                }
            }
        },
        onDraw: function () {
            this.x = (typeof this.opts.x === 'function') ? this.opts.x() : this.opts.x;
            this.y = (typeof this.opts.y === 'function') ? this.opts.y() : this.opts.y;
        },
        onDestroy: function () {
            void 0;
        },
        onCreate: function () {
            this.tex = this.opts.texNormal;
            this.depth = this.opts.depth;
        }
    };

    ct.templates.templates.VJOYSTICK = {
        onCreate: function () {
            this.tex = this.opts.tex;
            this.depth = this.opts.depth;
            this.down = false;
            this.trackball = new PIXI.Sprite(ct.res.getTexture(this.opts.trackballTex, 0));
            this.addChild(this.trackball);
        },
        // eslint-disable-next-line complexity
        onStep: function () {
            var dx = 0,
                dy = 0;
            if (ct.mouse) {
                if (ct.mouse.hoversUi(this)) {
                    if (ct.mouse.down) {
                        this.down = true;
                    }
                }
                if (ct.mouse.released) {
                    this.down = false;
                }
                if (this.down) {
                    dx = ct.mouse.xui - this.x;
                    dy = ct.mouse.yui - this.y;
                }
            }
            if (ct.touch) {
                if (!this.touchId) {
                    for (const touch of ct.touch.events) {
                        if (ct.touch.collideUi(this, touch.id)) {
                            this.down = true;
                            this.touchId = touch.id;
                            break;
                        }
                    }
                }
                var touch = ct.touch.getById(this.touchId);
                if (touch) {
                    dx = touch.xui - this.x;
                    dy = touch.yui - this.y;
                } else {
                    this.touchId = false;
                    this.down = false;
                }
            }
            if (ct.pointer) {
                if (this.trackedPointer && !ct.pointer.down.includes(this.trackedPointer)) {
                    this.trackedPointer = void 0;
                }
                if (!this.trackedPointer) {
                    const pointer = ct.pointer.collidesUi(this);
                    if (pointer) {
                        this.down = true;
                        this.trackedPointer = pointer;
                    }
                }
                if (this.trackedPointer) {
                    dx = this.trackedPointer.xui - this.x;
                    dy = this.trackedPointer.yui - this.y;
                } else {
                    this.touchId = false;
                    this.down = false;
                }
            }
            var r = this.shape.r || this.shape.right || 64;
            if (this.down) {
                dx /= r;
                dy /= r;
                var length = Math.hypot(dx, dy);
                if (length > 1) {
                    dx /= length;
                    dy /= length;
                }
                ct.inputs.registry['vkeys.' + this.opts.key + 'X'] = dx;
                ct.inputs.registry['vkeys.' + this.opts.key + 'Y'] = dy;
            } else {
                ct.inputs.registry['vkeys.' + this.opts.key + 'X'] = 0;
                ct.inputs.registry['vkeys.' + this.opts.key + 'Y'] = 0;
            }
            this.trackball.x = dx * r;
            this.trackball.y = dy * r;
        },
        onDraw: function () {
            this.x = (typeof this.opts.x === 'function') ? this.opts.x() : this.opts.x;
            this.y = (typeof this.opts.y === 'function') ? this.opts.y() : this.opts.y;
        },
        onDestroy: function () {
            void 0;
        }
    };
})();
/* eslint-disable max-lines-per-function */
(function ctTransitionTemplates() {
    const devourer = () => {
        void 0;
    };
    ct.templates.templates.CTTRANSITION_FADE = {
        onStep() {
            void 0;
        },
        onDraw() {
            void 0;
        },
        onDestroy() {
            ct.rooms.remove(this.room);
        },
        onCreate() {
            this.tex = -1;
            this.overlay = new PIXI.Graphics();
            this.overlay.beginFill(this.color);
            this.overlay.drawRect(0, 0, ct.camera.width + 1, ct.camera.height + 1);
            this.overlay.endFill();
            this.overlay.alpha = this.in ? 1 : 0;
            this.addChild(this.overlay);
            this.promise = ct.tween.add({
                obj: this.overlay,
                fields: {
                    alpha: this.in ? 0 : 1
                },
                duration: this.duration,
                silent: true
            }).then(() => {
                this.kill = true;
            });
        }
    };
    ct.templates.templates.CTTRANSITION_SCALE = {
        onStep() {
            void 0;
        },
        onDraw() {
            void 0;
        },
        onDestroy() {
            ct.rooms.remove(this.room);
        },
        onCreate() {
            this.tex = -1;
            this.overlay = new PIXI.Graphics();
            this.overlay.beginFill(this.color);
            this.overlay.drawRect(0, 0, ct.camera.width + 1, ct.camera.height + 1);
            this.overlay.endFill();
            this.overlay.alpha = this.in ? 1 : 0;
            this.addChild(this.overlay);
            var sourceX = ct.camera.scale.x,
                sourceY = ct.camera.scale.y,
                endX = this.in ? sourceX : sourceX * this.scaling,
                endY = this.in ? sourceY : sourceY * this.scaling,
                startX = this.in ? sourceX * this.scaling : sourceX,
                startY = this.in ? sourceY * this.scaling : sourceY;
            ct.camera.scale.x = startX;
            ct.camera.scale.y = startY;
            this.promise = ct.tween.add({
                obj: ct.camera.scale,
                fields: {
                    x: endX,
                    y: endY
                },
                duration: this.duration,
                silent: true
            }).then(() => {
                ct.camera.scale.x = sourceX;
                ct.camera.scale.y = sourceY;
                this.kill = true;
            });
            ct.tween.add({
                obj: this.overlay,
                fields: {
                    alpha: this.in ? 0 : 1
                },
                duration: this.duration,
                silent: true
            })
            .catch(devourer);
        }
    };
    ct.templates.templates.CTTRANSITION_SLIDE = {
        onStep() {
            void 0;
        },
        onDraw() {
            void 0;
        },
        onDestroy() {
            ct.rooms.remove(this.room);
        },
        onCreate() {
            this.tex = -1;
            this.overlay = new PIXI.Graphics();
            this.overlay.beginFill(this.color);
            this.overlay.drawRect(0, 0, (ct.camera.width + 1), (ct.camera.height + 1));
            this.overlay.endFill();

            if (this.endAt === 'left' || this.endAt === 'right') {
                this.scale.x = this.in ? 1 : 0;
                this.promise = ct.tween.add({
                    obj: this.scale,
                    fields: {
                        x: this.in ? 0 : 1
                    },
                    duration: this.duration,
                    curve: ct.tween.easeOutQuart,
                    silent: true
                }).then(() => {
                    this.kill = true;
                });
            } else {
                this.scale.y = this.in ? 1 : 0;
                this.promise = ct.tween.add({
                    obj: this.scale,
                    fields: {
                        y: this.in ? 0 : 1
                    },
                    duration: this.duration,
                    curve: ct.tween.easeOutQuart,
                    silent: true
                }).then(() => {
                    this.kill = true;
                });
            }
            if (!this.in && this.endAt === 'left') {
                this.x = (ct.camera.width + 1);
                ct.tween.add({
                    obj: this,
                    fields: {
                        x: 0
                    },
                    duration: this.duration,
                    curve: ct.tween.easeOutQuart,
                    silent: true
                })
                .catch(devourer);
            }
            if (!this.in && this.endAt === 'top') {
                this.y = (ct.camera.height + 1);
                ct.tween.add({
                    obj: this,
                    fields: {
                        y: 0
                    },
                    duration: this.duration,
                    curve: ct.tween.easeOutQuart,
                    silent: true
                })
                .catch(devourer);
            }
            if (this.in && this.endAt === 'right') {
                ct.tween.add({
                    obj: this,
                    fields: {
                        x: (ct.camera.width + 1)
                    },
                    duration: this.duration,
                    curve: ct.tween.easeOutQuart,
                    silent: true
                })
                .catch(devourer);
            }
            if (this.in && this.endAt === 'bottom') {
                ct.tween.add({
                    obj: this,
                    fields: {
                        y: (ct.camera.height + 1)
                    },
                    duration: this.duration,
                    curve: ct.tween.easeOutQuart,
                    silent: true
                })
                .catch(devourer);
            }

            this.addChild(this.overlay);
        }
    };

    ct.templates.templates.CTTRANSITION_CIRCLE = {
        onStep() {
            void 0;
        },
        onDraw() {
            void 0;
        },
        onDestroy() {
            ct.rooms.remove(this.room);
        },
        onCreate() {
            this.tex = -1;
            this.x = (ct.camera.width + 1) / 2;
            this.y = (ct.camera.height + 1) / 2;
            this.overlay = new PIXI.Graphics();
            this.overlay.beginFill(this.color);
            this.overlay.drawCircle(
                0,
                0,
                ct.u.pdc(0, 0, (ct.camera.width + 1) / 2, (ct.camera.height + 1) / 2)
            );
            this.overlay.endFill();
            this.addChild(this.overlay);
            this.scale.x = this.scale.y = this.in ? 0 : 1;
            this.promise = ct.tween.add({
                obj: this.scale,
                fields: {
                    x: this.in ? 1 : 0,
                    y: this.in ? 1 : 0
                },
                duration: this.duration,
                silent: true
            }).then(() => {
                this.kill = true;
            });
        }
    };
})();


    ct.templates.beforeStep = function beforeStep() {
        
    };
    ct.templates.afterStep = function afterStep() {
        
    };
    ct.templates.beforeDraw = function beforeDraw() {
        if ([false][0] && this instanceof ct.templates.Copy) {
    const inverse = this.transform.localTransform.clone().invert();
    this.$cDebugCollision.transform.setFromMatrix(inverse);
    this.$cDebugCollision.position.set(0, 0);
    this.$cDebugText.transform.setFromMatrix(inverse);
    this.$cDebugText.position.set(0, 0);

    const newtext = `Partitions: ${this.$chashes.join(', ')}
CGroup: ${this.cgroup || 'unset'}
Shape: ${(this._shape && this._shape.__type) || 'unused'}`;
    if (this.$cDebugText.text !== newtext) {
        this.$cDebugText.text = newtext;
    }
    this.$cDebugCollision
    .clear();
    ct.place.drawDebugGraphic.apply(this);
    this.$cHadCollision = false;
}

    };
    ct.templates.afterDraw = function afterDraw() {
        /* eslint-disable no-underscore-dangle */
if ((this.transform && (this.transform._localID !== this.transform._currentLocalID)) ||
    this.x !== this.xprev ||
    this.y !== this.yprev
) {
    delete this._shape;
    const oldHashes = this.$chashes || [];
    this.$chashes = ct.place.getHashes(this);
    for (const hash of oldHashes) {
        if (this.$chashes.indexOf(hash) === -1) {
            ct.place.grid[hash].splice(ct.place.grid[hash].indexOf(this), 1);
        }
    }
    for (const hash of this.$chashes) {
        if (oldHashes.indexOf(hash) === -1) {
            if (!(hash in ct.place.grid)) {
                ct.place.grid[hash] = [this];
            } else {
                ct.place.grid[hash].push(this);
            }
        }
    }
}

    };
    ct.templates.onDestroy = function onDestroy() {
        if (this.$chashes) {
    for (const hash of this.$chashes) {
        ct.place.grid[hash].splice(ct.place.grid[hash].indexOf(this), 1);
    }
}

    };
})(ct);
/**
 * @extends {PIXI.TilingSprite}
 * @property {number} shiftX How much to shift the texture horizontally, in pixels.
 * @property {number} shiftY How much to shift the texture vertically, in pixels.
 * @property {number} movementX The speed at which the background's texture moves by X axis,
 * wrapping around its area. The value is measured in pixels per frame, and takes
 * `ct.delta` into account.
 * @property {number} movementY The speed at which the background's texture moves by Y axis,
 * wrapping around its area. The value is measured in pixels per frame, and takes
 * `ct.delta` into account.
 * @property {number} parallaxX A value that makes background move faster
 * or slower relative to other objects. It is often used to create an effect of depth.
 * `1` means regular movement, values smaller than 1
 * will make it move slower and make an effect that a background is placed farther away from camera;
 * values larger than 1 will do the opposite, making the background appear closer than the rest
 * of object.
 * This property is for horizontal movement.
 * @property {number} parallaxY A value that makes background move faster
 * or slower relative to other objects. It is often used to create an effect of depth.
 * `1` means regular movement, values smaller than 1
 * will make it move slower and make an effect that a background is placed farther away from camera;
 * values larger than 1 will do the opposite, making the background appear closer than the rest
 * of object.
 * This property is for vertical movement.
 * @class
 */
class Background extends PIXI.TilingSprite {
    constructor(texName, frame = 0, depth = 0, exts = {}) {
        var width = ct.camera.width,
            height = ct.camera.height;
        const texture = texName instanceof PIXI.Texture ?
            texName :
            ct.res.getTexture(texName, frame || 0);
        if (exts.repeat === 'no-repeat' || exts.repeat === 'repeat-x') {
            height = texture.height * (exts.scaleY || 1);
        }
        if (exts.repeat === 'no-repeat' || exts.repeat === 'repeat-y') {
            width = texture.width * (exts.scaleX || 1);
        }
        super(texture, width, height);
        if (!ct.backgrounds.list[texName]) {
            ct.backgrounds.list[texName] = [];
        }
        ct.backgrounds.list[texName].push(this);
        ct.templates.list.BACKGROUND.push(this);
        ct.stack.push(this);
        this.anchor.x = this.anchor.y = 0;
        this.depth = depth;
        this.shiftX = this.shiftY = this.movementX = this.movementY = 0;
        this.parallaxX = this.parallaxY = 1;
        if (exts) {
            ct.u.extend(this, exts);
        }
        if (this.scaleX) {
            this.tileScale.x = Number(this.scaleX);
        }
        if (this.scaleY) {
            this.tileScale.y = Number(this.scaleY);
        }
        this.reposition();
    }
    onStep() {
        this.shiftX += ct.delta * this.movementX;
        this.shiftY += ct.delta * this.movementY;
    }
    /**
     * Updates the position of this background.
     */
    reposition() {
        const cameraBounds = this.isUi ?
            {
                x: 0, y: 0, width: ct.camera.width, height: ct.camera.height
            } :
            ct.camera.getBoundingBox();
        const dx = ct.camera.x - ct.camera.width / 2,
              dy = ct.camera.y - ct.camera.height / 2;
        if (this.repeat !== 'repeat-x' && this.repeat !== 'no-repeat') {
            this.y = cameraBounds.y;
            this.tilePosition.y = -this.y - dy * (this.parallaxY - 1) + this.shiftY;
            this.height = cameraBounds.height + 1;
        } else {
            this.y = this.shiftY + cameraBounds.y * (this.parallaxY - 1);
        }
        if (this.repeat !== 'repeat-y' && this.repeat !== 'no-repeat') {
            this.x = cameraBounds.x;
            this.tilePosition.x = -this.x - dx * (this.parallaxX - 1) + this.shiftX;
            this.width = cameraBounds.width + 1;
        } else {
            this.x = this.shiftX + cameraBounds.x * (this.parallaxX - 1);
        }
    }
    onDraw() {
        this.reposition();
    }
    static onCreate() {
        void 0;
    }
    static onDestroy() {
        void 0;
    }
    get isUi() {
        return this.parent ? Boolean(this.parent.isUi) : false;
    }
}
/**
 * @namespace
 */
ct.backgrounds = {
    Background,
    list: {},
    /**
     * @returns {Background} The created background
     */
    add(texName, frame = 0, depth = 0, container = ct.room) {
        if (!texName) {
            throw new Error('[ct.backgrounds] The texName argument is required.');
        }
        const bg = new Background(texName, frame, depth);
        container.addChild(bg);
        return bg;
    }
};
ct.templates.Background = Background;

/**
 * @extends {PIXI.Container}
 * @class
 */
class Tilemap extends PIXI.Container {
    /**
     * @param {object} template A template object that contains data about depth
     * and tile placement. It is usually used by ct.IDE.
     */
    constructor(template) {
        super();
        this.pixiTiles = [];
        if (template) {
            this.depth = template.depth;
            this.tiles = template.tiles.map(tile => ({
                ...tile
            }));
            if (template.extends) {
                Object.assign(this, template.extends);
            }
            for (let i = 0, l = template.tiles.length; i < l; i++) {
                const tile = template.tiles[i];
                const textures = ct.res.getTexture(tile.texture);
                const sprite = new PIXI.Sprite(textures[tile.frame]);
                sprite.anchor.x = textures[0].defaultAnchor.x;
                sprite.anchor.y = textures[0].defaultAnchor.y;
                sprite.shape = textures.shape;
                sprite.scale.set(tile.scale.x, tile.scale.y);
                sprite.rotation = tile.rotation;
                sprite.alpha = tile.opacity;
                sprite.tint = tile.tint;
                sprite.x = tile.x;
                sprite.y = tile.y;
                this.addChild(sprite);
                this.pixiTiles.push(sprite);
                this.tiles[i].sprite = sprite;
            }
        } else {
            this.tiles = [];
        }
        ct.templates.list.TILEMAP.push(this);
    }
    /**
     * Adds a tile to the tilemap. Will throw an error if a tilemap is cached.
     * @param {string} textureName The name of the texture to use
     * @param {number} x The horizontal location of the tile
     * @param {number} y The vertical location of the tile
     * @param {number} [frame] The frame to pick from the source texture. Defaults to 0.
     * @returns {PIXI.Sprite} The created tile
     */
    addTile(textureName, x, y, frame = 0) {
        if (this.cached) {
            throw new Error('[ct.tiles] Adding tiles to cached tilemaps is forbidden. Create a new tilemap, or add tiles before caching the tilemap.');
        }
        const texture = ct.res.getTexture(textureName, frame);
        const sprite = new PIXI.Sprite(texture);
        sprite.x = x;
        sprite.y = y;
        sprite.shape = texture.shape;
        this.tiles.push({
            texture: textureName,
            frame,
            x,
            y,
            width: sprite.width,
            height: sprite.height,
            sprite
        });
        this.addChild(sprite);
        this.pixiTiles.push(sprite);
        return sprite;
    }
    /**
     * Enables caching on this tileset, freezing it and turning it
     * into a series of bitmap textures. This proides great speed boost,
     * but prevents further editing.
     */
    cache(chunkSize = 1024) {
        if (this.cached) {
            throw new Error('[ct.tiles] Attempt to cache an already cached tilemap.');
        }

        // Divide tiles into a grid of larger cells so that we can cache these cells as
        const bounds = this.getLocalBounds();
        const cols = Math.ceil(bounds.width / chunkSize),
              rows = Math.ceil(bounds.height / chunkSize);
        this.cells = [];
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const cell = new PIXI.Container();
                this.cells.push(cell);
            }
        }
        for (let i = 0, l = this.tiles.length; i < l; i++) {
            const tile = this.children[0],
                  x = Math.floor((tile.x - bounds.x) / chunkSize),
                  y = Math.floor((tile.y - bounds.y) / chunkSize);
            this.cells[y * cols + x].addChild(tile);
        }
        this.removeChildren();

        // Filter out empty cells, cache filled ones
        for (let i = 0, l = this.cells.length; i < l; i++) {
            if (this.cells[i].children.length === 0) {
                this.cells.splice(i, 1);
                i--;
                l--;
                continue;
            }
            this.addChild(this.cells[i]);
            this.cells[i].cacheAsBitmap = true;
        }

        this.cached = true;
    }
    /**
     * Enables caching on this tileset, freezing it and turning it
     * into a series of bitmap textures. This proides great speed boost,
     * but prevents further editing.
     *
     * This version packs tiles into rhombus-shaped chunks, and sorts them
     * from top to bottom. This fixes seam issues for isometric games.
     */
    cacheDiamond(chunkSize = 1024) {
        if (this.cached) {
            throw new Error('[ct.tiles] Attempt to cache an already cached tilemap.');
        }

        this.cells = [];
        this.diamondCellMap = {};
        for (let i = 0, l = this.tiles.length; i < l; i++) {
            const tile = this.children[0];
            const [xNormalized, yNormalized] = ct.u.rotate(tile.x, tile.y * 2, -45);
            const x = Math.floor(xNormalized / chunkSize),
                  y = Math.floor(yNormalized / chunkSize),
                  key = `${x}:${y}`;
            if (!(key in this.diamondCellMap)) {
                const chunk = new PIXI.Container();
                chunk.chunkX = x;
                chunk.chunkY = y;
                this.diamondCellMap[key] = chunk;
                this.cells.push(chunk);
            }
            this.diamondCellMap[key].addChild(tile);
        }
        this.removeChildren();

        this.cells.sort((a, b) => {
            const maxA = Math.max(a.chunkY, a.chunkX),
                  maxB = Math.max(b.chunkY, b.chunkX);
            if (maxA === maxB) {
                return b.chunkX - a.chunkX;
            }
            return maxA - maxB;
        });

        for (let i = 0, l = this.cells.length; i < l; i++) {
            this.addChild(this.cells[i]);
            this.cells[i].cacheAsBitmap = true;
        }

        this.cached = true;
    }
}
ct.templates.Tilemap = Tilemap;

/**
 * @namespace
 */
ct.tilemaps = {
    /**
     * Creates a new tilemap at a specified depth, and adds it to the main room (ct.room).
     * @param {number} [depth] The depth of a newly created tilemap. Defaults to 0.
     * @returns {Tilemap} The created tilemap.
     */
    create(depth = 0) {
        const tilemap = new Tilemap();
        tilemap.depth = depth;
        ct.room.addChild(tilemap);
        return tilemap;
    },
    /**
     * Adds a tile to the specified tilemap. It is the same as
     * calling `tilemap.addTile(textureName, x, y, frame).
     * @param {Tilemap} tilemap The tilemap to modify.
     * @param {string} textureName The name of the texture to use.
     * @param {number} x The horizontal location of the tile.
     * @param {number} y The vertical location of the tile.
     * @param {number} [frame] The frame to pick from the source texture. Defaults to 0.
     * @returns {PIXI.Sprite} The created tile
     */
    addTile(tilemap, textureName, x, y, frame = 0) {
        return tilemap.addTile(textureName, x, y, frame);
    },
    /**
     * Enables caching on this tileset, freezing it and turning it
     * into a series of bitmap textures. This proides great speed boost,
     * but prevents further editing.
     *
     * This is the same as calling `tilemap.cache();`
     *
     * @param {Tilemap} tilemap The tilemap which needs to be cached.
     * @param {number} chunkSize The size of one chunk.
     */
    cache(tilemap, chunkSize) {
        tilemap.cache(chunkSize);
    },
    /**
     * Enables caching on this tileset, freezing it and turning it
     * into a series of bitmap textures. This proides great speed boost,
     * but prevents further editing.
     *
     * This version packs tiles into rhombus-shaped chunks, and sorts them
     * from top to bottom. This fixes seam issues for isometric games.
     * Note that tiles should be placed on a flat plane for the proper sorting.
     * If you need an effect of elevation, consider shifting each tile with
     * tile.pivot.y property.
     *
     * This is the same as calling `tilemap.cacheDiamond();`
     *
     * @param {Tilemap} tilemap The tilemap which needs to be cached.
     * @param {number} chunkSize The size of one chunk.
     */
    cacheDiamond(tilemap, chunkSize) {
        tilemap.cacheDiamond(chunkSize);
    }
};

/**
 * This class represents a camera that is used by ct.js' cameras.
 * Usually you won't create new instances of it, but if you need, you can substitute
 * ct.camera with a new one.
 *
 * @extends {PIXI.DisplayObject}
 * @class
 *
 * @property {number} x The real x-coordinate of the camera.
 * It does not have a screen shake effect applied, as well as may differ from `targetX`
 * if the camera is in transition.
 * @property {number} y The real y-coordinate of the camera.
 * It does not have a screen shake effect applied, as well as may differ from `targetY`
 * if the camera is in transition.
 * @property {number} width The width of the unscaled shown region.
 * This is the base, unscaled value. Use ct.camera.scale.x to get a scaled version.
 * To change this value, see `ct.width` property.
 * @property {number} height The width of the unscaled shown region.
 * This is the base, unscaled value. Use ct.camera.scale.y to get a scaled version.
 * To change this value, see `ct.height` property.
 * @property {number} targetX The x-coordinate of the target location.
 * Moving it instead of just using the `x` parameter will trigger the drift effect.
 * @property {number} targetY The y-coordinate of the target location.
 * Moving it instead of just using the `y` parameter will trigger the drift effect.
 *
 * @property {Copy|false} follow If set, the camera will follow the given copy.
 * @property {boolean} followX Works if `follow` is set to a copy.
 * Enables following in X axis. Set it to `false` and followY to `true`
 * to limit automatic camera movement to vertical axis.
 * @property {boolean} followY Works if `follow` is set to a copy.
 * Enables following in Y axis. Set it to `false` and followX to `true`
 * to limit automatic camera movement to horizontal axis.
 * @property {number|null} borderX Works if `follow` is set to a copy.
 * Sets the frame inside which the copy will be kept, in game pixels.
 * Can be set to `null` so the copy is set to the center of the screen.
 * @property {number|null} borderY Works if `follow` is set to a copy.
 * Sets the frame inside which the copy will be kept, in game pixels.
 * Can be set to `null` so the copy is set to the center of the screen.
 * @property {number} shiftX Displaces the camera horizontally
 * but does not change x and y parameters.
 * @property {number} shiftY Displaces the camera vertically
 * but does not change x and y parameters.
 * @property {number} drift Works if `follow` is set to a copy.
 * If set to a value between 0 and 1, it will make camera movement smoother
 *
 * @property {number} shake The current power of a screen shake effect,
 * relative to the screen's max side (100 is 100% of screen shake).
 * If set to 0 or less, it, disables the effect.
 * @property {number} shakePhase The current phase of screen shake oscillation.
 * @property {number} shakeDecay The amount of `shake` units substracted in a second.
 * Default is 5.
 * @property {number} shakeFrequency The base frequency of the screen shake effect.
 * Default is 50.
 * @property {number} shakeX A multiplier applied to the horizontal screen shake effect.
 * Default is 1.
 * @property {number} shakeY A multiplier applied to the vertical screen shake effect.
 * Default is 1.
 * @property {number} shakeMax The maximum possible value for the `shake` property
 * to protect players from losing their monitor, in `shake` units. Default is 10.
 */
const Camera = (function Camera() {
    const shakeCamera = function shakeCamera(camera, delta) {
        const sec = delta / (PIXI.Ticker.shared.maxFPS || 60);
        camera.shake -= sec * camera.shakeDecay;
        camera.shake = Math.max(0, camera.shake);
        if (camera.shakeMax) {
            camera.shake = Math.min(camera.shake, camera.shakeMax);
        }
        const phaseDelta = sec * camera.shakeFrequency;
        camera.shakePhase += phaseDelta;
        // no logic in these constants
        // They are used to desync fluctuations and remove repetitive circular movements
        camera.shakePhaseX += phaseDelta * (1 + Math.sin(camera.shakePhase * 0.1489) * 0.25);
        camera.shakePhaseY += phaseDelta * (1 + Math.sin(camera.shakePhase * 0.1734) * 0.25);
    };
    const followCamera = function followCamera(camera) {
        // eslint-disable-next-line max-len
        const bx = camera.borderX === null ? camera.width / 2 : Math.min(camera.borderX, camera.width / 2),
              // eslint-disable-next-line max-len
              by = camera.borderY === null ? camera.height / 2 : Math.min(camera.borderY, camera.height / 2);
        const tl = camera.uiToGameCoord(bx, by),
              br = camera.uiToGameCoord(camera.width - bx, camera.height - by);

        if (camera.followX) {
            if (camera.follow.x < tl.x - camera.interpolatedShiftX) {
                camera.targetX = camera.follow.x - bx + camera.width / 2;
            } else if (camera.follow.x > br.x - camera.interpolatedShiftX) {
                camera.targetX = camera.follow.x + bx - camera.width / 2;
            }
        }
        if (camera.followY) {
            if (camera.follow.y < tl.y - camera.interpolatedShiftY) {
                camera.targetY = camera.follow.y - by + camera.height / 2;
            } else if (camera.follow.y > br.y - camera.interpolatedShiftY) {
                camera.targetY = camera.follow.y + by - camera.height / 2;
            }
        }
    };
    const restrictInRect = function restrictInRect(camera) {
        if (camera.minX !== void 0) {
            const boundary = camera.minX + camera.width * camera.scale.x * 0.5;
            camera.x = Math.max(boundary, camera.x);
            camera.targetX = Math.max(boundary, camera.targetX);
        }
        if (camera.maxX !== void 0) {
            const boundary = camera.maxX - camera.width * camera.scale.x * 0.5;
            camera.x = Math.min(boundary, camera.x);
            camera.targetX = Math.min(boundary, camera.targetX);
        }
        if (camera.minY !== void 0) {
            const boundary = camera.minY + camera.height * camera.scale.y * 0.5;
            camera.y = Math.max(boundary, camera.y);
            camera.targetY = Math.max(boundary, camera.targetY);
        }
        if (camera.maxY !== void 0) {
            const boundary = camera.maxY - camera.height * camera.scale.y * 0.5;
            camera.y = Math.min(boundary, camera.y);
            camera.targetY = Math.min(boundary, camera.targetY);
        }
    };
    class Camera extends PIXI.DisplayObject {
        constructor(x, y, w, h) {
            super();
            this.follow = this.rotate = false;
            this.followX = this.followY = true;
            this.targetX = this.x = x;
            this.targetY = this.y = y;
            this.z = 500;
            this.width = w || 1920;
            this.height = h || 1080;
            this.shiftX = this.shiftY = this.interpolatedShiftX = this.interpolatedShiftY = 0;
            this.borderX = this.borderY = null;
            this.drift = 0;

            this.shake = 0;
            this.shakeDecay = 5;
            this.shakeX = this.shakeY = 1;
            this.shakeFrequency = 50;
            this.shakePhase = this.shakePhaseX = this.shakePhaseY = 0;
            this.shakeMax = 10;

            this.getBounds = this.getBoundingBox;
        }

        get scale() {
            return this.transform.scale;
        }
        set scale(value) {
            if (typeof value === 'number') {
                value = {
                    x: value,
                    y: value
                };
            }
            this.transform.scale.copyFrom(value);
        }

        /**
         * Moves the camera to a new position. It will have a smooth transition
         * if a `drift` parameter is set.
         * @param {number} x New x coordinate
         * @param {number} y New y coordinate
         * @returns {void}
         */
        moveTo(x, y) {
            this.targetX = x;
            this.targetY = y;
        }

        /**
         * Moves the camera to a new position. Ignores the `drift` value.
         * @param {number} x New x coordinate
         * @param {number} y New y coordinate
         * @returns {void}
         */
        teleportTo(x, y) {
            this.targetX = this.x = x;
            this.targetY = this.y = y;
            this.shakePhase = this.shakePhaseX = this.shakePhaseY = 0;
            this.interpolatedShiftX = this.shiftX;
            this.interpolatedShiftY = this.shiftY;
        }

        /**
         * Updates the position of the camera
         * @param {number} delta A delta value between the last two frames.
         * This is usually ct.delta.
         * @returns {void}
         */
        update(delta) {
            shakeCamera(this, delta);
            // Check if we've been following a copy that is now killed
            if (this.follow && this.follow.kill) {
                this.follow = false;
            }
            // Autofollow the first copy of the followed template, set in the room's settings
            if (!this.follow && ct.room.follow) {
                this.follow = ct.templates.list[ct.room.follow][0];
            }
            // Follow copies around
            if (this.follow && ('x' in this.follow) && ('y' in this.follow)) {
                followCamera(this);
            }

            // The speed of drift movement
            const speed = this.drift ? Math.min(1, (1 - this.drift) * delta) : 1;
            // Perform drift motion
            this.x = this.targetX * speed + this.x * (1 - speed);
            this.y = this.targetY * speed + this.y * (1 - speed);

            // Off-center shifts drift, too
            this.interpolatedShiftX = this.shiftX * speed + this.interpolatedShiftX * (1 - speed);
            this.interpolatedShiftY = this.shiftY * speed + this.interpolatedShiftY * (1 - speed);

            restrictInRect(this);

            // Recover from possible calculation errors
            this.x = this.x || 0;
            this.y = this.y || 0;
        }

        /**
         * Returns the current camera position plus the screen shake effect.
         * @type {number}
         */
        get computedX() {
            // eslint-disable-next-line max-len
            const dx = (Math.sin(this.shakePhaseX) + Math.sin(this.shakePhaseX * 3.1846) * 0.25) / 1.25;
            // eslint-disable-next-line max-len
            const x = this.x + dx * this.shake * Math.max(this.width, this.height) / 100 * this.shakeX;
            return x + this.interpolatedShiftX;
        }
        /**
         * Returns the current camera position plus the screen shake effect.
         * @type {number}
         */
        get computedY() {
            // eslint-disable-next-line max-len
            const dy = (Math.sin(this.shakePhaseY) + Math.sin(this.shakePhaseY * 2.8948) * 0.25) / 1.25;
            // eslint-disable-next-line max-len
            const y = this.y + dy * this.shake * Math.max(this.width, this.height) / 100 * this.shakeY;
            return y + this.interpolatedShiftY;
        }

        /**
         * Returns the position of the left edge where the visible rectangle ends,
         * in game coordinates.
         * This can be used for UI positioning in game coordinates.
         * This does not count for rotations, though.
         * For rotated and/or scaled viewports, see `getTopLeftCorner`
         * and `getBottomLeftCorner` methods.
         * @returns {number} The location of the left edge.
         * @type {number}
         * @readonly
         */
        get left() {
            return this.computedX - (this.width / 2) * this.scale.x;
        }
        /**
         * Returns the position of the top edge where the visible rectangle ends,
         * in game coordinates.
         * This can be used for UI positioning in game coordinates.
         * This does not count for rotations, though.
         * For rotated and/or scaled viewports, see `getTopLeftCorner`
         * and `getTopRightCorner` methods.
         * @returns {number} The location of the top edge.
         * @type {number}
         * @readonly
         */
        get top() {
            return this.computedY - (this.height / 2) * this.scale.y;
        }
        /**
         * Returns the position of the right edge where the visible rectangle ends,
         * in game coordinates.
         * This can be used for UI positioning in game coordinates.
         * This does not count for rotations, though.
         * For rotated and/or scaled viewports, see `getTopRightCorner`
         * and `getBottomRightCorner` methods.
         * @returns {number} The location of the right edge.
         * @type {number}
         * @readonly
         */
        get right() {
            return this.computedX + (this.width / 2) * this.scale.x;
        }
        /**
         * Returns the position of the bottom edge where the visible rectangle ends,
         * in game coordinates. This can be used for UI positioning in game coordinates.
         * This does not count for rotations, though.
         * For rotated and/or scaled viewports, see `getBottomLeftCorner`
         * and `getBottomRightCorner` methods.
         * @returns {number} The location of the bottom edge.
         * @type {number}
         * @readonly
         */
        get bottom() {
            return this.computedY + (this.height / 2) * this.scale.y;
        }

        /**
         * Translates a point from UI space to game space.
         * @param {number} x The x coordinate in UI space.
         * @param {number} y The y coordinate in UI space.
         * @returns {PIXI.Point} A pair of new `x` and `y` coordinates.
         */
        uiToGameCoord(x, y) {
            const modx = (x - this.width / 2) * this.scale.x,
                  mody = (y - this.height / 2) * this.scale.y;
            const result = ct.u.rotate(modx, mody, this.angle);
            return new PIXI.Point(
                result.x + this.computedX,
                result.y + this.computedY
            );
        }

        /**
         * Translates a point from game space to UI space.
         * @param {number} x The x coordinate in game space.
         * @param {number} y The y coordinate in game space.
         * @returns {PIXI.Point} A pair of new `x` and `y` coordinates.
         */
        gameToUiCoord(x, y) {
            const relx = x - this.computedX,
                  rely = y - this.computedY;
            const unrotated = ct.u.rotate(relx, rely, -this.angle);
            return new PIXI.Point(
                unrotated.x / this.scale.x + this.width / 2,
                unrotated.y / this.scale.y + this.height / 2
            );
        }
        /**
         * Gets the position of the top-left corner of the viewport in game coordinates.
         * This is useful for positioning UI elements in game coordinates,
         * especially with rotated viewports.
         * @returns {PIXI.Point} A pair of `x` and `y` coordinates.
         */
        getTopLeftCorner() {
            return this.uiToGameCoord(0, 0);
        }

        /**
         * Gets the position of the top-right corner of the viewport in game coordinates.
         * This is useful for positioning UI elements in game coordinates,
         * especially with rotated viewports.
         * @returns {PIXI.Point} A pair of `x` and `y` coordinates.
         */
        getTopRightCorner() {
            return this.uiToGameCoord(this.width, 0);
        }

        /**
         * Gets the position of the bottom-left corner of the viewport in game coordinates.
         * This is useful for positioning UI elements in game coordinates,
         * especially with rotated viewports.
         * @returns {PIXI.Point} A pair of `x` and `y` coordinates.
         */
        getBottomLeftCorner() {
            return this.uiToGameCoord(0, this.height);
        }

        /**
         * Gets the position of the bottom-right corner of the viewport in game coordinates.
         * This is useful for positioning UI elements in game coordinates,
         * especially with rotated viewports.
         * @returns {PIXI.Point} A pair of `x` and `y` coordinates.
         */
        getBottomRightCorner() {
            return this.uiToGameCoord(this.width, this.height);
        }

        /**
         * Returns the bounding box of the camera.
         * Useful for rotated viewports when something needs to be reliably covered by a rectangle.
         * @returns {PIXI.Rectangle} The bounding box of the camera.
         */
        getBoundingBox() {
            const bb = new PIXI.Bounds();
            const tl = this.getTopLeftCorner(),
                  tr = this.getTopRightCorner(),
                  bl = this.getBottomLeftCorner(),
                  br = this.getBottomRightCorner();
            bb.addPoint(new PIXI.Point(tl.x, tl.y));
            bb.addPoint(new PIXI.Point(tr.x, tr.y));
            bb.addPoint(new PIXI.Point(bl.x, bl.y));
            bb.addPoint(new PIXI.Point(br.x, br.y));
            return bb.getRectangle();
        }

        /**
         * Checks whether a given object (or any Pixi's DisplayObject)
         * is potentially visible, meaning that its bounding box intersects
         * the camera's bounding box.
         * @param {PIXI.DisplayObject} copy An object to check for.
         * @returns {boolean} `true` if an object is visible, `false` otherwise.
         */
        contains(copy) {
            // `true` skips transforms recalculations, boosting performance
            const bounds = copy.getBounds(true);
            return bounds.right > 0 &&
                bounds.left < this.width * this.scale.x &&
                bounds.bottom > 0 &&
                bounds.top < this.width * this.scale.y;
        }

        /**
         * Realigns all the copies in a room so that they distribute proportionally
         * to a new camera size based on their `xstart` and `ystart` coordinates.
         * Will throw an error if the given room is not in UI space (if `room.isUi` is not `true`).
         * You can skip the realignment for some copies
         * if you set their `skipRealign` parameter to `true`.
         * @param {Room} room The room which copies will be realigned.
         * @returns {void}
         */
        realign(room) {
            if (!room.isUi) {
                throw new Error('[ct.camera] An attempt to realing a room that is not in UI space. The room in question is', room);
            }
            const w = (ct.rooms.templates[room.name].width || 1),
                  h = (ct.rooms.templates[room.name].height || 1);
            for (const copy of room.children) {
                if (!('xstart' in copy) || copy.skipRealign) {
                    continue;
                }
                copy.x = copy.xstart / w * this.width;
                copy.y = copy.ystart / h * this.height;
            }
        }
        /**
         * This will align all non-UI layers in the game according to the camera's transforms.
         * This is automatically called internally, and you will hardly ever use it.
         * @returns {void}
         */
        manageStage() {
            const px = this.computedX,
                  py = this.computedY,
                  sx = 1 / (isNaN(this.scale.x) ? 1 : this.scale.x),
                  sy = 1 / (isNaN(this.scale.y) ? 1 : this.scale.y);
            for (const item of ct.stage.children) {
                if (!item.isUi && item.pivot) {
                    item.x = -this.width / 2;
                    item.y = -this.height / 2;
                    item.pivot.x = px;
                    item.pivot.y = py;
                    item.scale.x = sx;
                    item.scale.y = sy;
                    item.angle = -this.angle;
                }
            }
        }
    }
    return Camera;
})(ct);
void Camera;

(function timerAddon() {
    const ctTimerTime = Symbol('time');
    const ctTimerRoomUid = Symbol('roomUid');
    const ctTimerTimeLeftOriginal = Symbol('timeLeftOriginal');
    const promiseResolve = Symbol('promiseResolve');
    const promiseReject = Symbol('promiseReject');

    /**
     * @property {boolean} isUi Whether the timer uses ct.deltaUi or not.
     * @property {string|false} name The name of the timer
     */
    class CtTimer {
        /**
         * An object for holding a timer
         *
         * @param {number} timeMs The length of the timer, **in milliseconds**
         * @param {string|false} [name=false] The name of the timer
         * @param {boolean} [uiDelta=false] If `true`, it will use `ct.deltaUi` for counting time.
         * if `false`, it will use `ct.delta` for counting time.
         */
        constructor(timeMs, name = false, uiDelta = false) {
            this[ctTimerRoomUid] = ct.room.uid || null;
            this.name = name && name.toString();
            this.isUi = uiDelta;
            this[ctTimerTime] = 0;
            this[ctTimerTimeLeftOriginal] = timeMs;
            this.timeLeft = this[ctTimerTimeLeftOriginal];
            this.promise = new Promise((resolve, reject) => {
                this[promiseResolve] = resolve;
                this[promiseReject] = reject;
            });
            this.rejected = false;
            this.done = false;
            this.settled = false;
            ct.timer.timers.add(this);
        }

        /**
         * Attaches callbacks for the resolution and/or rejection of the Promise.
         *
         * @param {Function} onfulfilled The callback to execute when the Promise is resolved.
         * @param {Function} [onrejected] The callback to execute when the Promise is rejected.
         * @returns {Promise} A Promise for the completion of which ever callback is executed.
         */
        then(...args) {
            return this.promise.then(...args);
        }
        /**
         * Attaches a callback for the rejection of the Promise.
         *
         * @param {Function} [onrejected] The callback to execute when the Promise is rejected.
         * @returns {Promise} A Promise for the completion of which ever callback is executed.
         */
        catch(onrejected) {
            return this.promise.catch(onrejected);
        }

        /**
         * The time passed on this timer, in seconds
         * @type {number}
         */
        get time() {
            return this[ctTimerTime] * 1000 / ct.speed;
        }
        set time(newTime) {
            this[ctTimerTime] = newTime / 1000 * ct.speed;
        }

        /**
         * Updates the timer. **DONT CALL THIS UNLESS YOU KNOW WHAT YOU ARE DOING**
         *
         * @returns {void}
         * @private
         */
        update() {
            // Not something that would normally happen,
            // but do check whether this timer was not automatically removed
            if (this.rejected === true || this.done === true) {
                this.remove();
                return;
            }
            this[ctTimerTime] += this.isUi ? ct.deltaUi : ct.delta;
            if (ct.room.uid !== this[ctTimerRoomUid] && this[ctTimerRoomUid] !== null) {
                this.reject({
                    info: 'Room switch',
                    from: 'ct.timer'
                }); // Reject if the room was switched
            }

            // If the timer is supposed to end
            if (this.timeLeft !== 0) {
                this.timeLeft = this[ctTimerTimeLeftOriginal] - this.time;
                if (this.timeLeft <= 0) {
                    this.resolve();
                }
            }
        }

        /**
         * Instantly triggers the timer and calls the callbacks added through `then` method.
         * @returns {void}
         */
        resolve() {
            if (this.settled) {
                return;
            }
            this.done = true;
            this.settled = true;
            this[promiseResolve]();
            this.remove();
        }
        /**
         * Stops the timer with a given message by rejecting a Promise object.
         * @param {any} message The value to pass to the `catch` callback
         * @returns {void}
         */
        reject(message) {
            if (this.settled) {
                return;
            }
            this.rejected = true;
            this.settled = true;
            this[promiseReject](message);
            this.remove();
        }
        /**
         * Removes the timer from ct.js game loop. This timer will not trigger.
         * @returns {void}
         */
        remove() {
            ct.timer.timers.delete(this);
        }
    }
    window.CtTimer = CtTimer;

    /**
     * Timer utilities
     * @namespace
     */
    ct.timer = {
        /**
         * A set with all the active timers.
         * @type Set<CtTimer>
         */
        timers: new Set(),
        counter: 0,
        /**
         * Adds a new timer with a given name
         *
         * @param {number} timeMs The length of the timer, **in milliseconds**
         * @param {string|false} [name=false] The name of the timer, which you use
         * to access it from `ct.timer.timers`.
         * @returns {CtTimer} The timer
         */
        add(timeMs, name = false) {
            return new CtTimer(timeMs, name, false);
        },
        /**
         * Adds a new timer with a given name that runs in a UI time scale
         *
         * @param {number} timeMs The length of the timer, **in milliseconds**
         * @param {string|false} [name=false] The name of the timer, which you use
         * to access it from `ct.timer.timers`.
         * @returns {CtTimer} The timer
         */
        addUi(timeMs, name = false) {
            return new CtTimer(timeMs, name, true);
        },
        /**
         * Updates the timers. **DONT CALL THIS UNLESS YOU KNOW WHAT YOU ARE DOING**
         *
         * @returns {void}
         * @private
         */
        updateTimers() {
            for (const timer of this.timers) {
                timer.update();
            }
        }
    };
})();
if (document.fonts) { for (const font of document.fonts) { font.load(); }}/**
 * @typedef ICtPlaceRectangle
 * @property {number} [x1] The left side of the rectangle.
 * @property {number} [y1] The upper side of the rectangle.
 * @property {number} [x2] The right side of the rectangle.
 * @property {number} [y2] The bottom side of the rectangle.
 * @property {number} [x] The left side of the rectangle.
 * @property {number} [y] The upper side of the rectangle.
 * @property {number} [width] The right side of the rectangle.
 * @property {number} [height] The bottom side of the rectangle.
 */
/**
 * @typedef ICtPlaceLineSegment
 * @property {number} x1 The horizontal coordinate of the starting point of the ray.
 * @property {number} y1 The vertical coordinate of the starting point of the ray.
 * @property {number} x2 The horizontal coordinate of the ending point of the ray.
 * @property {number} y2 The vertical coordinate of the ending point of the ray.
 */
/**
 * @typedef ICtPlaceCircle
 * @property {number} x The horizontal coordinate of the circle's center.
 * @property {number} y The vertical coordinate of the circle's center.
 * @property {number} radius The radius of the circle.
 */
/* eslint-disable no-underscore-dangle */
/* global SSCD */
/* eslint prefer-destructuring: 0 */
(function ctPlace(ct) {
    const circlePrecision = 16;
    const debugMode = [false][0];

    const getSSCDShapeFromRect = function (obj) {
        const {shape} = obj,
              position = new SSCD.Vector(obj.x, obj.y);
        if (obj.angle === 0) {
            position.x -= obj.scale.x > 0 ?
                (shape.left * obj.scale.x) :
                (-obj.scale.x * shape.right);
            position.y -= obj.scale.y > 0 ?
                (shape.top * obj.scale.y) :
                (-shape.bottom * obj.scale.y);
            return new SSCD.Rectangle(
                position,
                new SSCD.Vector(
                    Math.abs((shape.left + shape.right) * obj.scale.x),
                    Math.abs((shape.bottom + shape.top) * obj.scale.y)
                )
            );
        }
        const upperLeft = ct.u.rotate(
            -shape.left * obj.scale.x,
            -shape.top * obj.scale.y, obj.angle
        );
        const bottomLeft = ct.u.rotate(
            -shape.left * obj.scale.x,
            shape.bottom * obj.scale.y, obj.angle
        );
        const bottomRight = ct.u.rotate(
            shape.right * obj.scale.x,
            shape.bottom * obj.scale.y, obj.angle
        );
        const upperRight = ct.u.rotate(
            shape.right * obj.scale.x,
            -shape.top * obj.scale.y, obj.angle
        );
        return new SSCD.LineStrip(position, [
            new SSCD.Vector(upperLeft.x, upperLeft.y),
            new SSCD.Vector(bottomLeft.x, bottomLeft.y),
            new SSCD.Vector(bottomRight.x, bottomRight.y),
            new SSCD.Vector(upperRight.x, upperRight.y)
        ], true);
    };

    const getSSCDShapeFromCircle = function (obj) {
        const {shape} = obj,
              position = new SSCD.Vector(obj.x, obj.y);
        if (Math.abs(obj.scale.x) === Math.abs(obj.scale.y)) {
            return new SSCD.Circle(position, shape.r * Math.abs(obj.scale.x));
        }
        const vertices = [];
        for (let i = 0; i < circlePrecision; i++) {
            const point = [
                ct.u.ldx(shape.r * obj.scale.x, 360 / circlePrecision * i),
                ct.u.ldy(shape.r * obj.scale.y, 360 / circlePrecision * i)
            ];
            if (obj.angle !== 0) {
                const {x, y} = ct.u.rotate(point[0], point[1], obj.angle);
                vertices.push(new SSCD.Vector(x, y));
            } else {
                vertices.push(new SSCD.Vector(point[0], point[1]));
            }
        }
        return new SSCD.LineStrip(position, vertices, true);
    };

    const getSSCDShapeFromStrip = function (obj) {
        const {shape} = obj,
              position = new SSCD.Vector(obj.x, obj.y);
        const vertices = [];
        if (obj.angle !== 0) {
            for (const point of shape.points) {
                const {x, y} = ct.u.rotate(
                    point.x * obj.scale.x,
                    point.y * obj.scale.y, obj.angle
                );
                vertices.push(new SSCD.Vector(x, y));
            }
        } else {
            for (const point of shape.points) {
                vertices.push(new SSCD.Vector(point.x * obj.scale.x, point.y * obj.scale.y));
            }
        }
        return new SSCD.LineStrip(position, vertices, Boolean(shape.closedStrip));
    };

    const getSSCDShapeFromLine = function (obj) {
        const {shape} = obj;
        if (obj.angle !== 0) {
            const {x: x1, y: y1} = ct.u.rotate(
                shape.x1 * obj.scale.x,
                shape.y1 * obj.scale.y,
                obj.angle
            );
            const {x: x2, y: y2} = ct.u.rotate(
                shape.x2 * obj.scale.x,
                shape.y2 * obj.scale.y,
                obj.angle
            );
            return new SSCD.Line(
                new SSCD.Vector(
                    obj.x + x1,
                    obj.y + y1
                ),
                new SSCD.Vector(
                    x2 - x1,
                    y2 - y1
                )
            );
        }
        return new SSCD.Line(
            new SSCD.Vector(
                obj.x + shape.x1 * obj.scale.x,
                obj.y + shape.y1 * obj.scale.y
            ),
            new SSCD.Vector(
                (shape.x2 - shape.x1) * obj.scale.x,
                (shape.y2 - shape.y1) * obj.scale.y
            )
        );
    };

    /**
     * Gets SSCD shapes from object's shape field and its transforms.
     */
    var getSSCDShape = function (obj) {
        switch (obj.shape.type) {
        case 'rect':
            return getSSCDShapeFromRect(obj);
        case 'circle':
            return getSSCDShapeFromCircle(obj);
        case 'strip':
            return getSSCDShapeFromStrip(obj);
        case 'line':
            return getSSCDShapeFromLine(obj);
        default:
            return new SSCD.Circle(new SSCD.Vector(obj.x, obj.y), 0);
        }
    };

    // Premade filter predicates to avoid function creation and memory bloat during the game loop.
    const templateNameFilter = (target, other, template) => other.template === template;
    const cgroupFilter = (target, other, cgroup) => !cgroup || cgroup === other.cgroup;

    // Core collision-checking method that accepts various filtering predicates
    // and a variable partitioning grid.

    // eslint-disable-next-line max-params
    const genericCollisionQuery = function (
        target,
        customX,
        customY,
        partitioningGrid,
        queryAll,
        filterPredicate,
        filterVariable
    ) {
        const oldx = target.x,
              oldy = target.y;
        const shapeCashed = target._shape;
        let hashes, results;
        // Apply arbitrary location to the checked object
        if (customX !== void 0 && (oldx !== customX || oldy !== customY)) {
            target.x = customX;
            target.y = customY;
            target._shape = getSSCDShape(target);
            hashes = ct.place.getHashes(target);
        } else {
            hashes = target.$chashes || ct.place.getHashes(target);
            target._shape = target._shape || getSSCDShape(target);
        }
        if (queryAll) {
            results = [];
        }
        // Get all the known objects in close proximity to the tested object,
        // sourcing from the passed partitioning grid.
        for (const hash of hashes) {
            const array = partitioningGrid[hash];
            // Such partition cell is absent
            if (!array) {
                continue;
            }
            for (const obj of array) {
                // Skip checks against the tested object itself.
                if (obj === target) {
                    continue;
                }
                // Filter out objects
                if (!filterPredicate(target, obj, filterVariable)) {
                    continue;
                }
                // Check for collision between two objects
                if (ct.place.collide(target, obj)) {
                    // Singular pick; return the collided object immediately.
                    if (!queryAll) {
                        // Return the object back to its old position.
                        // Skip SSCD shape re-calculation.
                        if (oldx !== target.x || oldy !== target.y) {
                            target.x = oldx;
                            target.y = oldy;
                            target._shape = shapeCashed;
                        }
                        return obj;
                    }
                    // Multiple pick; push the collided object into an array.
                    if (!results.includes(obj)) {
                        results.push(obj);
                    }
                }
            }
        }
        // Return the object back to its old position.
        // Skip SSCD shape re-calculation.
        if (oldx !== target.x || oldy !== target.y) {
            target.x = oldx;
            target.y = oldy;
            target._shape = shapeCashed;
        }
        if (!queryAll) {
            return false;
        }
        return results;
    };

    ct.place = {
        m: 1, // direction modifier in ct.place.go,
        gridX: [1024][0] || 512,
        gridY: [1024][0] || 512,
        grid: {},
        tileGrid: {},
        getHashes(copy) {
            var hashes = [];
            var x = Math.round(copy.x / ct.place.gridX),
                y = Math.round(copy.y / ct.place.gridY),
                dx = Math.sign(copy.x - ct.place.gridX * x),
                dy = Math.sign(copy.y - ct.place.gridY * y);
            hashes.push(`${x}:${y}`);
            if (dx) {
                hashes.push(`${x + dx}:${y}`);
                if (dy) {
                    hashes.push(`${x + dx}:${y + dy}`);
                }
            }
            if (dy) {
                hashes.push(`${x}:${y + dy}`);
            }
            return hashes;
        },
        /**
         * Applied to copies in the debug mode. Draws a collision shape
         * @this Copy
         * @param {boolean} [absolute] Whether to use room coordinates
         * instead of coordinates relative to the copy.
         * @returns {void}
         */
        drawDebugGraphic(absolute) {
            const shape = this._shape || getSSCDShape(this);
            const g = this.$cDebugCollision;
            const inverse = this.transform.localTransform.clone().invert();
            this.$cDebugCollision.transform.setFromMatrix(inverse);
            this.$cDebugCollision.position.set(0, 0);
            let color = 0x00ffff;
            if (this instanceof Copy) {
                color = 0x0066ff;
            } else if (this instanceof PIXI.Sprite) {
                color = 0x6600ff;
            }
            if (this.$cHadCollision) {
                color = 0x00ff00;
            }
            g.lineStyle(2, color);
            if (shape instanceof SSCD.Rectangle) {
                const pos = shape.get_position(),
                      size = shape.get_size();
                g.beginFill(color, 0.1);
                if (!absolute) {
                    g.drawRect(pos.x - this.x, pos.y - this.y, size.x, size.y);
                } else {
                    g.drawRect(pos.x, pos.y, size.x, size.y);
                }
                g.endFill();
            } else if (shape instanceof SSCD.LineStrip) {
                if (!absolute) {
                    g.moveTo(shape.__points[0].x, shape.__points[0].y);
                    for (let i = 1; i < shape.__points.length; i++) {
                        g.lineTo(shape.__points[i].x, shape.__points[i].y);
                    }
                } else {
                    g.moveTo(shape.__points[0].x + this.x, shape.__points[0].y + this.y);
                    for (let i = 1; i < shape.__points.length; i++) {
                        g.lineTo(shape.__points[i].x + this.x, shape.__points[i].y + this.y);
                    }
                }
            } else if (shape instanceof SSCD.Circle && shape.get_radius() > 0) {
                g.beginFill(color, 0.1);
                if (!absolute) {
                    g.drawCircle(0, 0, shape.get_radius());
                } else {
                    g.drawCircle(this.x, this.y, shape.get_radius());
                }
                g.endFill();
            } else if (shape instanceof SSCD.Line) {
                if (!absolute) {
                    g.moveTo(
                        shape.__position.x,
                        shape.__position.y
                    ).lineTo(
                        shape.__position.x + shape.__dest.x,
                        shape.__position.y + shape.__dest.y
                    );
                } else {
                    const p1 = shape.get_p1();
                    const p2 = shape.get_p2();
                    g.moveTo(p1.x, p1.y)
                    .lineTo(p2.x, p2.y);
                }
            } else if (!absolute) { // Treat as a point
                g.moveTo(-16, -16)
                .lineTo(16, 16)
                .moveTo(-16, 16)
                .lineTo(16, -16);
            } else {
                g.moveTo(-16 + this.x, -16 + this.y)
                .lineTo(16 + this.x, 16 + this.y)
                .moveTo(-16 + this.x, 16 + this.y)
                .lineTo(16 + this.x, -16 + this.y);
            }
        },
        collide(c1, c2) {
            // ct.place.collide(<c1: Copy, c2: Copy>)
            // Test collision between two copies
            c1._shape = c1._shape || getSSCDShape(c1);
            c2._shape = c2._shape || getSSCDShape(c2);
            if (c1._shape.__type === 'strip' ||
                c2._shape.__type === 'strip' ||
                c1._shape.__type === 'complex' ||
                c2._shape.__type === 'complex'
            ) {
                const aabb1 = c1._shape.get_aabb(),
                      aabb2 = c2._shape.get_aabb();
                if (!aabb1.intersects(aabb2)) {
                    return false;
                }
            }
            if (SSCD.CollisionManager.test_collision(c1._shape, c2._shape)) {
                if ([false][0]) {
                    c1.$cHadCollision = true;
                    c2.$cHadCollision = true;
                }
                return true;
            }
            return false;
        },
        /**
         * Determines if the place in (x,y) is occupied by any copies or tiles.
         * Optionally can take 'cgroup' as a filter for obstacles'
         * collision group (not shape type).
         *
         * @param {Copy} me The object to check collisions on.
         * @param {number} [x] The x coordinate to check, as if `me` was placed there.
         * @param {number} [y] The y coordinate to check, as if `me` was placed there.
         * @param {String} [cgroup] The collision group to check against
         * @returns {Copy|Array<Copy>} The collided copy, or an array of all the detected collisions
         * (if `multiple` is `true`)
         */
        occupied(target, x, y, cgroup) {
            if (typeof y !== 'number') {
                // No arbitrary location was passed, rewrite arguments w/o them.
                cgroup = x;
                x = void 0;
                y = void 0;
            }
            const copies = genericCollisionQuery(
                target, x, y,
                ct.place.grid,
                false,
                cgroupFilter, cgroup
            );
            // Was any suitable copy found? Return it immediately and skip the query for tiles.
            if (copies) {
                return copies;
            }
            // Return query result for tiles.
            return genericCollisionQuery(
                target, x, y,
                ct.place.tileGrid,
                false,
                cgroupFilter, cgroup
            );
        },
        occupiedMultiple(target, x, y, cgroup) {
            if (typeof y !== 'number') {
                // No arbitrary location was passed, rewrite arguments w/o them.
                cgroup = x;
                x = void 0;
                y = void 0;
            }
            const copies = genericCollisionQuery(
                target, x, y,
                ct.place.grid,
                true,
                cgroupFilter, cgroup
            );
            const tiles = genericCollisionQuery(
                target, x, y,
                ct.place.tileGrid,
                true,
                cgroupFilter, cgroup
            );
            return copies.concat(tiles);
        },
        free(me, x, y, cgroup) {
            return !ct.place.occupied(me, x, y, cgroup);
        },
        meet(target, x, y, templateName) {
            if (typeof y !== 'number') {
                // No arbitrary location was passed, rewrite arguments w/o them.
                templateName = x;
                x = void 0;
                y = void 0;
            }
            return genericCollisionQuery(
                target, x, y,
                ct.place.grid,
                false,
                templateNameFilter, templateName
            );
        },
        meetMultiple(target, x, y, templateName) {
            if (typeof y !== 'number') {
                // No arbitrary location was passed, rewrite arguments w/o them.
                templateName = x;
                x = void 0;
                y = void 0;
            }
            return genericCollisionQuery(
                target, x, y,
                ct.place.grid,
                true,
                templateNameFilter, templateName
            );
        },
        copies(target, x, y, cgroup) {
            if (typeof y !== 'number') {
                // No arbitrary location was passed, rewrite arguments w/o them.
                cgroup = x;
                x = void 0;
                y = void 0;
            }
            return genericCollisionQuery(
                target, x, y,
                ct.place.grid,
                false,
                cgroupFilter, cgroup
            );
        },
        copiesMultiple(target, x, y, cgroup) {
            if (typeof y !== 'number') {
                // No arbitrary location was passed, rewrite arguments w/o them.
                cgroup = x;
                x = void 0;
                y = void 0;
            }
            return genericCollisionQuery(
                target, x, y,
                ct.place.grid,
                true,
                cgroupFilter, cgroup
            );
        },
        tiles(target, x, y, cgroup) {
            if (typeof y !== 'number') {
                // No arbitrary location was passed, rewrite arguments w/o them.
                cgroup = x;
                x = void 0;
                y = void 0;
            }
            return genericCollisionQuery(
                target, x, y,
                ct.place.tileGrid,
                false,
                cgroupFilter, cgroup
            );
        },
        tilesMultiple(target, x, y, cgroup) {
            if (typeof y !== 'number') {
                // No arbitrary location was passed, rewrite arguments w/o them.
                cgroup = x;
                x = void 0;
                y = void 0;
            }
            return genericCollisionQuery(
                target, x, y,
                ct.place.tileGrid,
                true,
                cgroupFilter, cgroup
            );
        },
        lastdist: null,
        nearest(x, y, templateName) {
            // ct.place.nearest(x: number, y: number, templateName: string)
            const copies = ct.templates.list[templateName];
            if (copies.length > 0) {
                var dist = Math.hypot(x - copies[0].x, y - copies[0].y);
                var inst = copies[0];
                for (const copy of copies) {
                    if (Math.hypot(x - copy.x, y - copy.y) < dist) {
                        dist = Math.hypot(x - copy.x, y - copy.y);
                        inst = copy;
                    }
                }
                ct.place.lastdist = dist;
                return inst;
            }
            return false;
        },
        furthest(x, y, template) {
            // ct.place.furthest(<x: number, y: number, template: Template>)
            const templates = ct.templates.list[template];
            if (templates.length > 0) {
                var dist = Math.hypot(x - templates[0].x, y - templates[0].y);
                var inst = templates[0];
                for (const copy of templates) {
                    if (Math.hypot(x - copy.x, y - copy.y) > dist) {
                        dist = Math.hypot(x - copy.x, y - copy.y);
                        inst = copy;
                    }
                }
                ct.place.lastdist = dist;
                return inst;
            }
            return false;
        },
        enableTilemapCollisions(tilemap, exactCgroup) {
            const cgroup = exactCgroup || tilemap.cgroup;
            if (tilemap.addedCollisions) {
                throw new Error('[ct.place] The tilemap already has collisions enabled.');
            }
            tilemap.cgroup = cgroup;
            // Prebake hashes and SSCD shapes for all the tiles
            for (const pixiSprite of tilemap.pixiTiles) {
                // eslint-disable-next-line no-underscore-dangle
                pixiSprite._shape = getSSCDShape(pixiSprite);
                pixiSprite.cgroup = cgroup;
                pixiSprite.$chashes = ct.place.getHashes(pixiSprite);
                /* eslint max-depth: 0 */
                for (const hash of pixiSprite.$chashes) {
                    if (!(hash in ct.place.tileGrid)) {
                        ct.place.tileGrid[hash] = [pixiSprite];
                    } else {
                        ct.place.tileGrid[hash].push(pixiSprite);
                    }
                }
                pixiSprite.depth = tilemap.depth;
            }
            if (debugMode) {
                for (const pixiSprite of tilemap.pixiTiles) {
                    pixiSprite.$cDebugCollision = new PIXI.Graphics();
                    ct.place.drawDebugGraphic.apply(pixiSprite, [false]);
                    pixiSprite.addChild(pixiSprite.$cDebugCollision);
                }
            }
            tilemap.addedCollisions = true;
        },
        moveAlong(me, dir, length, cgroup, precision) {
            if (!length) {
                return false;
            }
            if (typeof cgroup === 'number') {
                precision = cgroup;
                cgroup = void 0;
            }
            precision = Math.abs(precision || 1);
            if (length < 0) {
                length *= -1;
                dir += 180;
            }
            var dx = Math.cos(dir * Math.PI / 180) * precision,
                dy = Math.sin(dir * Math.PI / 180) * precision;
            while (length > 0) {
                if (length < 1) {
                    dx *= length;
                    dy *= length;
                }
                const occupied = ct.place.occupied(me, me.x + dx, me.y + dy, cgroup);
                if (!occupied) {
                    me.x += dx;
                    me.y += dy;
                    delete me._shape;
                } else {
                    return occupied;
                }
                length--;
            }
            return false;
        },
        moveByAxes(me, dx, dy, cgroup, precision) {
            if (dx === dy === 0) {
                return false;
            }
            if (typeof cgroup === 'number') {
                precision = cgroup;
                cgroup = void 0;
            }
            const obstacles = {
                x: false,
                y: false
            };
            precision = Math.abs(precision || 1);
            while (Math.abs(dx) > precision) {
                const occupied =
                    ct.place.occupied(me, me.x + Math.sign(dx) * precision, me.y, cgroup);
                if (!occupied) {
                    me.x += Math.sign(dx) * precision;
                    dx -= Math.sign(dx) * precision;
                } else {
                    obstacles.x = occupied;
                    break;
                }
            }
            while (Math.abs(dy) > precision) {
                const occupied =
                    ct.place.occupied(me, me.x, me.y + Math.sign(dy) * precision, cgroup);
                if (!occupied) {
                    me.y += Math.sign(dy) * precision;
                    dy -= Math.sign(dy) * precision;
                } else {
                    obstacles.y = occupied;
                    break;
                }
            }
            // A fraction of precision may be left but completely reachable; jump to this point.
            if (Math.abs(dx) < precision) {
                if (ct.place.free(me, me.x + dx, me.y, cgroup)) {
                    me.x += dx;
                }
            }
            if (Math.abs(dy) < precision) {
                if (ct.place.free(me, me.x, me.y + dy, cgroup)) {
                    me.y += dy;
                }
            }
            if (!obstacles.x && !obstacles.y) {
                return false;
            }
            return obstacles;
        },
        go(me, x, y, length, cgroup) {
            // ct.place.go(<me: Copy, x: number, y: number, length: number>[, cgroup: String])
            // tries to reach the target with a simple obstacle avoidance algorithm

            // if we are too close to the destination, exit
            if (ct.u.pdc(me.x, me.y, x, y) < length) {
                if (ct.place.free(me, x, y, cgroup)) {
                    me.x = x;
                    me.y = y;
                    delete me._shape;
                }
                return;
            }
            var dir = ct.u.pdn(me.x, me.y, x, y);

            //if there are no obstackles in front of us, go forward
            let projectedX = me.x + ct.u.ldx(length, dir),
                projectedY = me.y + ct.u.ldy(length, dir);
            if (ct.place.free(me, projectedX, projectedY, cgroup)) {
                me.x = projectedX;
                me.y = projectedY;
                delete me._shape;
                me.dir = dir;
            // otherwise, try to change direction by 30...60...90 degrees.
            // Direction changes over time (ct.place.m).
            } else {
                for (var i = -1; i <= 1; i += 2) {
                    for (var j = 30; j < 150; j += 30) {
                        projectedX = me.x + ct.u.ldx(length, dir + j * ct.place.m * i);
                        projectedY = me.y + ct.u.ldy(length, dir + j * ct.place.m * i);
                        if (ct.place.free(me, projectedX, projectedY, cgroup)) {
                            me.x = projectedX;
                            me.y = projectedY;
                            delete me._shape;
                            me.dir = dir + j * ct.place.m * i;
                            return;
                        }
                    }
                }
            }
        },
        traceCustom(shape, oversized, cgroup, getAll) {
            const results = [];
            if (debugMode) {
                shape.$cDebugCollision = ct.place.debugTraceGraphics;
                ct.place.drawDebugGraphic.apply(shape, [true]);
            }
            // Oversized tracing shapes won't work with partitioning table, and thus
            // will need to loop over all the copies and tiles in the room.
            // Non-oversized shapes can use plain ct.place.occupied.
            if (!oversized) {
                if (getAll) {
                    return ct.place.occupiedMultiple(shape, cgroup);
                }
                return ct.place.occupied(shape, cgroup);
            }
            // Oversized shapes.
            // Loop over all the copies in the room.
            for (const copy of ct.stack) {
                if (!cgroup || copy.cgroup === cgroup) {
                    if (ct.place.collide(shape, copy)) {
                        if (getAll) {
                            results.push(copy);
                        } else {
                            return copy;
                        }
                    }
                }
            }
            // Additionally, loop over all the tilesets and their tiles.
            for (const tilemap of ct.templates.list.TILEMAP) {
                if (!tilemap.addedCollisions) {
                    continue;
                }
                if (cgroup && tilemap.cgroup !== cgroup) {
                    continue;
                }
                for (const tile of tilemap.pixiTiles) {
                    if (ct.place.collide(shape, tile)) {
                        if (getAll) {
                            results.push(tile);
                        } else {
                            return tile;
                        }
                    }
                }
            }
            if (!getAll) {
                return false;
            }
            return results;
        },
        /**
         * Tests for intersections with a line segment.
         * If `getAll` is set to `true`, returns all the copies that intersect
         * the line segment; otherwise, returns the first one that fits the conditions.
         *
         * @param {ICtPlaceLineSegment} line An object that describes the line segment.
         * @param {string} [cgroup] An optional collision group to trace against.
         * If omitted, will trace through all the copies in the current room.
         * @param {boolean} [getAll] Whether to return all the intersections (true),
         * or return the first one.
         * @returns {Copy|Array<Copy>}
         */
        traceLine(line, cgroup, getAll) {
            let oversized = false;
            if (Math.abs(line.x1 - line.x2) > ct.place.gridX) {
                oversized = true;
            } else if (Math.abs(line.y1 - line.y2) > ct.place.gridY) {
                oversized = true;
            }
            const shape = {
                x: line.x1,
                y: line.y1,
                scale: {
                    x: 1, y: 1
                },
                rotation: 0,
                angle: 0,
                shape: {
                    type: 'line',
                    x1: 0,
                    y1: 0,
                    x2: line.x2 - line.x1,
                    y2: line.y2 - line.y1
                }
            };
            const result = ct.place.traceCustom(shape, oversized, cgroup, getAll);
            if (getAll) {
                // An approximate sorting by distance
                result.sort(function sortCopies(a, b) {
                    var dist1, dist2;
                    dist1 = ct.u.pdc(line.x1, line.y1, a.x, a.y);
                    dist2 = ct.u.pdc(line.x1, line.y1, b.x, b.y);
                    return dist1 - dist2;
                });
            }
            return result;
        },
        /**
         * Tests for intersections with a filled rectangle.
         * If `getAll` is set to `true`, returns all the copies that intersect
         * the rectangle; otherwise, returns the first one that fits the conditions.
         *
         * @param {ICtPlaceRectangle} rect An object that describes the line segment.
         * @param {string} [cgroup] An optional collision group to trace against.
         * If omitted, will trace through all the copies in the current room.
         * @param {boolean} [getAll] Whether to return all the intersections (true),
         * or return the first one.
         * @returns {Copy|Array<Copy>}
         */
        traceRect(rect, cgroup, getAll) {
            let oversized = false;
            rect = { // Copy the object
                ...rect
            };
            // Turn x1, x2, y1, y2 into x, y, width, and height
            if ('x1' in rect) {
                rect.x = rect.x1;
                rect.y = rect.y1;
                rect.width = rect.x2 - rect.x1;
                rect.height = rect.y2 - rect.y1;
            }
            if (Math.abs(rect.width) > ct.place.gridX || Math.abs(rect.height) > ct.place.gridY) {
                oversized = true;
            }
            const shape = {
                x: rect.x,
                y: rect.y,
                scale: {
                    x: 1, y: 1
                },
                rotation: 0,
                angle: 0,
                shape: {
                    type: 'rect',
                    left: 0,
                    top: 0,
                    right: rect.width,
                    bottom: rect.height
                }
            };
            return ct.place.traceCustom(shape, oversized, cgroup, getAll);
        },
        /**
         * Tests for intersections with a filled circle.
         * If `getAll` is set to `true`, returns all the copies that intersect
         * the circle; otherwise, returns the first one that fits the conditions.
         *
         * @param {ICtPlaceCircle} rect An object that describes the line segment.
         * @param {string} [cgroup] An optional collision group to trace against.
         * If omitted, will trace through all the copies in the current room.
         * @param {boolean} [getAll] Whether to return all the intersections (true),
         * or return the first one.
         * @returns {Copy|Array<Copy>}
         */
        traceCircle(circle, cgroup, getAll) {
            let oversized = false;
            if (circle.radius * 2 > ct.place.gridX || circle.radius * 2 > ct.place.gridY) {
                oversized = true;
            }
            const shape = {
                x: circle.x,
                y: circle.y,
                scale: {
                    x: 1, y: 1
                },
                rotation: 0,
                angle: 0,
                shape: {
                    type: 'circle',
                    r: circle.radius
                }
            };
            return ct.place.traceCustom(shape, oversized, cgroup, getAll);
        },
        /**
         * Tests for intersections with a polyline. It is a hollow shape made
         * of connected line segments. The shape is not closed unless you add
         * the closing point by yourself.
         * If `getAll` is set to `true`, returns all the copies that intersect
         * the polyline; otherwise, returns the first one that fits the conditions.
         *
         * @param {Array<IPoint>} polyline An array of objects with `x` and `y` properties.
         * @param {string} [cgroup] An optional collision group to trace against.
         * If omitted, will trace through all the copies in the current room.
         * @param {boolean} [getAll] Whether to return all the intersections (true),
         * or return the first one.
         * @returns {Copy|Array<Copy>}
         */
        tracePolyline(polyline, cgroup, getAll) {
            const shape = {
                x: 0,
                y: 0,
                scale: {
                    x: 1, y: 1
                },
                rotation: 0,
                angle: 0,
                shape: {
                    type: 'strip',
                    points: polyline
                }
            };
            return ct.place.traceCustom(shape, true, cgroup, getAll);
        },
        /**
         * Tests for intersections with a point.
         * If `getAll` is set to `true`, returns all the copies that intersect
         * the point; otherwise, returns the first one that fits the conditions.
         *
         * @param {object} point An object with `x` and `y` properties.
         * @param {string} [cgroup] An optional collision group to trace against.
         * If omitted, will trace through all the copies in the current room.
         * @param {boolean} [getAll] Whether to return all the intersections (true),
         * or return the first one.
         * @returns {Copy|Array<Copy>}
         */
        tracePoint(point, cgroup, getAll) {
            const shape = {
                x: point.x,
                y: point.y,
                scale: {
                    x: 1, y: 1
                },
                rotation: 0,
                angle: 0,
                shape: {
                    type: 'point'
                }
            };
            return ct.place.traceCustom(shape, false, cgroup, getAll);
        }
    };
    // Aliases
    ct.place.traceRectange = ct.place.traceRect;
    // a magic procedure which tells 'go' function to change its direction
    setInterval(function switchCtPlaceGoDirection() {
        ct.place.m *= -1;
    }, 789);
})(ct);

(function ctKeyboard() {
    var keyPrefix = 'keyboard.';
    var setKey = function (key, value) {
        ct.inputs.registry[keyPrefix + key] = value;
    };

    ct.keyboard = {
        string: '',
        lastKey: '',
        lastCode: '',
        alt: false,
        shift: false,
        ctrl: false,
        clear() {
            delete ct.keyboard.lastKey;
            delete ct.keyboard.lastCode;
            ct.keyboard.string = '';
            ct.keyboard.alt = false;
            ct.keyboard.shift = false;
            ct.keyboard.ctrl = false;
        },
        check: [],
        onDown(e) {
            ct.keyboard.shift = e.shiftKey;
            ct.keyboard.alt = e.altKey;
            ct.keyboard.ctrl = e.ctrlKey;
            ct.keyboard.lastKey = e.key;
            ct.keyboard.lastCode = e.code;
            if (e.code) {
                setKey(e.code, 1);
            } else {
                setKey('Unknown', 1);
            }
            if (e.key) {
                if (e.key.length === 1) {
                    ct.keyboard.string += e.key;
                } else if (e.key === 'Backspace') {
                    ct.keyboard.string = ct.keyboard.string.slice(0, -1);
                } else if (e.key === 'Enter') {
                    ct.keyboard.string = '';
                }
            }
            e.preventDefault();
        },
        onUp(e) {
            ct.keyboard.shift = e.shiftKey;
            ct.keyboard.alt = e.altKey;
            ct.keyboard.ctrl = e.ctrlKey;
            if (e.code) {
                setKey(e.code, 0);
            } else {
                setKey('Unknown', 0);
            }
            e.preventDefault();
        }
    };

    if (document.addEventListener) {
        document.addEventListener('keydown', ct.keyboard.onDown, false);
        document.addEventListener('keyup', ct.keyboard.onUp, false);
    } else {
        document.attachEvent('onkeydown', ct.keyboard.onDown);
        document.attachEvent('onkeyup', ct.keyboard.onUp);
    }
})();

(function(global) {
    'use strict';
  
    var nativeKeyboardEvent = ('KeyboardEvent' in global);
    if (!nativeKeyboardEvent)
      global.KeyboardEvent = function KeyboardEvent() { throw TypeError('Illegal constructor'); };
  
    [
      ['DOM_KEY_LOCATION_STANDARD', 0x00], // Default or unknown location
      ['DOM_KEY_LOCATION_LEFT', 0x01], // e.g. Left Alt key
      ['DOM_KEY_LOCATION_RIGHT', 0x02], // e.g. Right Alt key
      ['DOM_KEY_LOCATION_NUMPAD', 0x03], // e.g. Numpad 0 or +
    ].forEach(function(p) { if (!(p[0] in global.KeyboardEvent)) global.KeyboardEvent[p[0]] = p[1]; });
  
    var STANDARD = global.KeyboardEvent.DOM_KEY_LOCATION_STANDARD,
        LEFT = global.KeyboardEvent.DOM_KEY_LOCATION_LEFT,
        RIGHT = global.KeyboardEvent.DOM_KEY_LOCATION_RIGHT,
        NUMPAD = global.KeyboardEvent.DOM_KEY_LOCATION_NUMPAD;
  
    //--------------------------------------------------------------------
    //
    // Utilities
    //
    //--------------------------------------------------------------------
  
    function contains(s, ss) { return String(s).indexOf(ss) !== -1; }
  
    var os = (function() {
      if (contains(navigator.platform, 'Win')) { return 'win'; }
      if (contains(navigator.platform, 'Mac')) { return 'mac'; }
      if (contains(navigator.platform, 'CrOS')) { return 'cros'; }
      if (contains(navigator.platform, 'Linux')) { return 'linux'; }
      if (contains(navigator.userAgent, 'iPad') || contains(navigator.platform, 'iPod') || contains(navigator.platform, 'iPhone')) { return 'ios'; }
      return '';
    } ());
  
    var browser = (function() {
      if (contains(navigator.userAgent, 'Chrome/')) { return 'chrome'; }
      if (contains(navigator.vendor, 'Apple')) { return 'safari'; }
      if (contains(navigator.userAgent, 'MSIE')) { return 'ie'; }
      if (contains(navigator.userAgent, 'Gecko/')) { return 'moz'; }
      if (contains(navigator.userAgent, 'Opera/')) { return 'opera'; }
      return '';
    } ());
  
    var browser_os = browser + '-' + os;
  
    function mergeIf(baseTable, select, table) {
      if (browser_os === select || browser === select || os === select) {
        Object.keys(table).forEach(function(keyCode) {
          baseTable[keyCode] = table[keyCode];
        });
      }
    }
  
    function remap(o, key) {
      var r = {};
      Object.keys(o).forEach(function(k) {
        var item = o[k];
        if (key in item) {
          r[item[key]] = item;
        }
      });
      return r;
    }
  
    function invert(o) {
      var r = {};
      Object.keys(o).forEach(function(k) {
        r[o[k]] = k;
      });
      return r;
    }
  
    //--------------------------------------------------------------------
    //
    // Generic Mappings
    //
    //--------------------------------------------------------------------
  
    // "keyInfo" is a dictionary:
    //   code: string - name from UI Events KeyboardEvent code Values
    //     https://w3c.github.io/uievents-code/
    //   location (optional): number - one of the DOM_KEY_LOCATION values
    //   keyCap (optional): string - keyboard label in en-US locale
    // USB code Usage ID from page 0x07 unless otherwise noted (Informative)
  
    // Map of keyCode to keyInfo
    var keyCodeToInfoTable = {
      // 0x01 - VK_LBUTTON
      // 0x02 - VK_RBUTTON
      0x03: { code: 'Cancel' }, // [USB: 0x9b] char \x0018 ??? (Not in D3E)
      // 0x04 - VK_MBUTTON
      // 0x05 - VK_XBUTTON1
      // 0x06 - VK_XBUTTON2
      0x06: { code: 'Help' }, // [USB: 0x75] ???
      // 0x07 - undefined
      0x08: { code: 'Backspace' }, // [USB: 0x2a] Labelled Delete on Macintosh keyboards.
      0x09: { code: 'Tab' }, // [USB: 0x2b]
      // 0x0A-0x0B - reserved
      0X0C: { code: 'Clear' }, // [USB: 0x9c] NumPad Center (Not in D3E)
      0X0D: { code: 'Enter' }, // [USB: 0x28]
      // 0x0E-0x0F - undefined
  
      0x10: { code: 'Shift' },
      0x11: { code: 'Control' },
      0x12: { code: 'Alt' },
      0x13: { code: 'Pause' }, // [USB: 0x48]
      0x14: { code: 'CapsLock' }, // [USB: 0x39]
      0x15: { code: 'KanaMode' }, // [USB: 0x88]
      0x16: { code: 'Lang1' }, // [USB: 0x90]
      // 0x17: VK_JUNJA
      // 0x18: VK_FINAL
      0x19: { code: 'Lang2' }, // [USB: 0x91]
      // 0x1A - undefined
      0x1B: { code: 'Escape' }, // [USB: 0x29]
      0x1C: { code: 'Convert' }, // [USB: 0x8a]
      0x1D: { code: 'NonConvert' }, // [USB: 0x8b]
      0x1E: { code: 'Accept' }, // [USB: ????]
      0x1F: { code: 'ModeChange' }, // [USB: ????]
  
      0x20: { code: 'Space' }, // [USB: 0x2c]
      0x21: { code: 'PageUp' }, // [USB: 0x4b]
      0x22: { code: 'PageDown' }, // [USB: 0x4e]
      0x23: { code: 'End' }, // [USB: 0x4d]
      0x24: { code: 'Home' }, // [USB: 0x4a]
      0x25: { code: 'ArrowLeft' }, // [USB: 0x50]
      0x26: { code: 'ArrowUp' }, // [USB: 0x52]
      0x27: { code: 'ArrowRight' }, // [USB: 0x4f]
      0x28: { code: 'ArrowDown' }, // [USB: 0x51]
      0x29: { code: 'Select' }, // (Not in D3E)
      0x2A: { code: 'Print' }, // (Not in D3E)
      0x2B: { code: 'Execute' }, // [USB: 0x74] (Not in D3E)
      0x2C: { code: 'PrintScreen' }, // [USB: 0x46]
      0x2D: { code: 'Insert' }, // [USB: 0x49]
      0x2E: { code: 'Delete' }, // [USB: 0x4c]
      0x2F: { code: 'Help' }, // [USB: 0x75] ???
  
      0x30: { code: 'Digit0', keyCap: '0' }, // [USB: 0x27] 0)
      0x31: { code: 'Digit1', keyCap: '1' }, // [USB: 0x1e] 1!
      0x32: { code: 'Digit2', keyCap: '2' }, // [USB: 0x1f] 2@
      0x33: { code: 'Digit3', keyCap: '3' }, // [USB: 0x20] 3#
      0x34: { code: 'Digit4', keyCap: '4' }, // [USB: 0x21] 4$
      0x35: { code: 'Digit5', keyCap: '5' }, // [USB: 0x22] 5%
      0x36: { code: 'Digit6', keyCap: '6' }, // [USB: 0x23] 6^
      0x37: { code: 'Digit7', keyCap: '7' }, // [USB: 0x24] 7&
      0x38: { code: 'Digit8', keyCap: '8' }, // [USB: 0x25] 8*
      0x39: { code: 'Digit9', keyCap: '9' }, // [USB: 0x26] 9(
      // 0x3A-0x40 - undefined
  
      0x41: { code: 'KeyA', keyCap: 'a' }, // [USB: 0x04]
      0x42: { code: 'KeyB', keyCap: 'b' }, // [USB: 0x05]
      0x43: { code: 'KeyC', keyCap: 'c' }, // [USB: 0x06]
      0x44: { code: 'KeyD', keyCap: 'd' }, // [USB: 0x07]
      0x45: { code: 'KeyE', keyCap: 'e' }, // [USB: 0x08]
      0x46: { code: 'KeyF', keyCap: 'f' }, // [USB: 0x09]
      0x47: { code: 'KeyG', keyCap: 'g' }, // [USB: 0x0a]
      0x48: { code: 'KeyH', keyCap: 'h' }, // [USB: 0x0b]
      0x49: { code: 'KeyI', keyCap: 'i' }, // [USB: 0x0c]
      0x4A: { code: 'KeyJ', keyCap: 'j' }, // [USB: 0x0d]
      0x4B: { code: 'KeyK', keyCap: 'k' }, // [USB: 0x0e]
      0x4C: { code: 'KeyL', keyCap: 'l' }, // [USB: 0x0f]
      0x4D: { code: 'KeyM', keyCap: 'm' }, // [USB: 0x10]
      0x4E: { code: 'KeyN', keyCap: 'n' }, // [USB: 0x11]
      0x4F: { code: 'KeyO', keyCap: 'o' }, // [USB: 0x12]
  
      0x50: { code: 'KeyP', keyCap: 'p' }, // [USB: 0x13]
      0x51: { code: 'KeyQ', keyCap: 'q' }, // [USB: 0x14]
      0x52: { code: 'KeyR', keyCap: 'r' }, // [USB: 0x15]
      0x53: { code: 'KeyS', keyCap: 's' }, // [USB: 0x16]
      0x54: { code: 'KeyT', keyCap: 't' }, // [USB: 0x17]
      0x55: { code: 'KeyU', keyCap: 'u' }, // [USB: 0x18]
      0x56: { code: 'KeyV', keyCap: 'v' }, // [USB: 0x19]
      0x57: { code: 'KeyW', keyCap: 'w' }, // [USB: 0x1a]
      0x58: { code: 'KeyX', keyCap: 'x' }, // [USB: 0x1b]
      0x59: { code: 'KeyY', keyCap: 'y' }, // [USB: 0x1c]
      0x5A: { code: 'KeyZ', keyCap: 'z' }, // [USB: 0x1d]
      0x5B: { code: 'MetaLeft', location: LEFT }, // [USB: 0xe3]
      0x5C: { code: 'MetaRight', location: RIGHT }, // [USB: 0xe7]
      0x5D: { code: 'ContextMenu' }, // [USB: 0x65] Context Menu
      // 0x5E - reserved
      0x5F: { code: 'Standby' }, // [USB: 0x82] Sleep
  
      0x60: { code: 'Numpad0', keyCap: '0', location: NUMPAD }, // [USB: 0x62]
      0x61: { code: 'Numpad1', keyCap: '1', location: NUMPAD }, // [USB: 0x59]
      0x62: { code: 'Numpad2', keyCap: '2', location: NUMPAD }, // [USB: 0x5a]
      0x63: { code: 'Numpad3', keyCap: '3', location: NUMPAD }, // [USB: 0x5b]
      0x64: { code: 'Numpad4', keyCap: '4', location: NUMPAD }, // [USB: 0x5c]
      0x65: { code: 'Numpad5', keyCap: '5', location: NUMPAD }, // [USB: 0x5d]
      0x66: { code: 'Numpad6', keyCap: '6', location: NUMPAD }, // [USB: 0x5e]
      0x67: { code: 'Numpad7', keyCap: '7', location: NUMPAD }, // [USB: 0x5f]
      0x68: { code: 'Numpad8', keyCap: '8', location: NUMPAD }, // [USB: 0x60]
      0x69: { code: 'Numpad9', keyCap: '9', location: NUMPAD }, // [USB: 0x61]
      0x6A: { code: 'NumpadMultiply', keyCap: '*', location: NUMPAD }, // [USB: 0x55]
      0x6B: { code: 'NumpadAdd', keyCap: '+', location: NUMPAD }, // [USB: 0x57]
      0x6C: { code: 'NumpadComma', keyCap: ',', location: NUMPAD }, // [USB: 0x85]
      0x6D: { code: 'NumpadSubtract', keyCap: '-', location: NUMPAD }, // [USB: 0x56]
      0x6E: { code: 'NumpadDecimal', keyCap: '.', location: NUMPAD }, // [USB: 0x63]
      0x6F: { code: 'NumpadDivide', keyCap: '/', location: NUMPAD }, // [USB: 0x54]
  
      0x70: { code: 'F1' }, // [USB: 0x3a]
      0x71: { code: 'F2' }, // [USB: 0x3b]
      0x72: { code: 'F3' }, // [USB: 0x3c]
      0x73: { code: 'F4' }, // [USB: 0x3d]
      0x74: { code: 'F5' }, // [USB: 0x3e]
      0x75: { code: 'F6' }, // [USB: 0x3f]
      0x76: { code: 'F7' }, // [USB: 0x40]
      0x77: { code: 'F8' }, // [USB: 0x41]
      0x78: { code: 'F9' }, // [USB: 0x42]
      0x79: { code: 'F10' }, // [USB: 0x43]
      0x7A: { code: 'F11' }, // [USB: 0x44]
      0x7B: { code: 'F12' }, // [USB: 0x45]
      0x7C: { code: 'F13' }, // [USB: 0x68]
      0x7D: { code: 'F14' }, // [USB: 0x69]
      0x7E: { code: 'F15' }, // [USB: 0x6a]
      0x7F: { code: 'F16' }, // [USB: 0x6b]
  
      0x80: { code: 'F17' }, // [USB: 0x6c]
      0x81: { code: 'F18' }, // [USB: 0x6d]
      0x82: { code: 'F19' }, // [USB: 0x6e]
      0x83: { code: 'F20' }, // [USB: 0x6f]
      0x84: { code: 'F21' }, // [USB: 0x70]
      0x85: { code: 'F22' }, // [USB: 0x71]
      0x86: { code: 'F23' }, // [USB: 0x72]
      0x87: { code: 'F24' }, // [USB: 0x73]
      // 0x88-0x8F - unassigned
  
      0x90: { code: 'NumLock', location: NUMPAD }, // [USB: 0x53]
      0x91: { code: 'ScrollLock' }, // [USB: 0x47]
      // 0x92-0x96 - OEM specific
      // 0x97-0x9F - unassigned
  
      // NOTE: 0xA0-0xA5 usually mapped to 0x10-0x12 in browsers
      0xA0: { code: 'ShiftLeft', location: LEFT }, // [USB: 0xe1]
      0xA1: { code: 'ShiftRight', location: RIGHT }, // [USB: 0xe5]
      0xA2: { code: 'ControlLeft', location: LEFT }, // [USB: 0xe0]
      0xA3: { code: 'ControlRight', location: RIGHT }, // [USB: 0xe4]
      0xA4: { code: 'AltLeft', location: LEFT }, // [USB: 0xe2]
      0xA5: { code: 'AltRight', location: RIGHT }, // [USB: 0xe6]
  
      0xA6: { code: 'BrowserBack' }, // [USB: 0x0c/0x0224]
      0xA7: { code: 'BrowserForward' }, // [USB: 0x0c/0x0225]
      0xA8: { code: 'BrowserRefresh' }, // [USB: 0x0c/0x0227]
      0xA9: { code: 'BrowserStop' }, // [USB: 0x0c/0x0226]
      0xAA: { code: 'BrowserSearch' }, // [USB: 0x0c/0x0221]
      0xAB: { code: 'BrowserFavorites' }, // [USB: 0x0c/0x0228]
      0xAC: { code: 'BrowserHome' }, // [USB: 0x0c/0x0222]
      0xAD: { code: 'AudioVolumeMute' }, // [USB: 0x7f]
      0xAE: { code: 'AudioVolumeDown' }, // [USB: 0x81]
      0xAF: { code: 'AudioVolumeUp' }, // [USB: 0x80]
  
      0xB0: { code: 'MediaTrackNext' }, // [USB: 0x0c/0x00b5]
      0xB1: { code: 'MediaTrackPrevious' }, // [USB: 0x0c/0x00b6]
      0xB2: { code: 'MediaStop' }, // [USB: 0x0c/0x00b7]
      0xB3: { code: 'MediaPlayPause' }, // [USB: 0x0c/0x00cd]
      0xB4: { code: 'LaunchMail' }, // [USB: 0x0c/0x018a]
      0xB5: { code: 'MediaSelect' },
      0xB6: { code: 'LaunchApp1' },
      0xB7: { code: 'LaunchApp2' },
      // 0xB8-0xB9 - reserved
      0xBA: { code: 'Semicolon',  keyCap: ';' }, // [USB: 0x33] ;: (US Standard 101)
      0xBB: { code: 'Equal', keyCap: '=' }, // [USB: 0x2e] =+
      0xBC: { code: 'Comma', keyCap: ',' }, // [USB: 0x36] ,<
      0xBD: { code: 'Minus', keyCap: '-' }, // [USB: 0x2d] -_
      0xBE: { code: 'Period', keyCap: '.' }, // [USB: 0x37] .>
      0xBF: { code: 'Slash', keyCap: '/' }, // [USB: 0x38] /? (US Standard 101)
  
      0xC0: { code: 'Backquote', keyCap: '`' }, // [USB: 0x35] `~ (US Standard 101)
      // 0xC1-0xCF - reserved
  
      // 0xD0-0xD7 - reserved
      // 0xD8-0xDA - unassigned
      0xDB: { code: 'BracketLeft', keyCap: '[' }, // [USB: 0x2f] [{ (US Standard 101)
      0xDC: { code: 'Backslash',  keyCap: '\\' }, // [USB: 0x31] \| (US Standard 101)
      0xDD: { code: 'BracketRight', keyCap: ']' }, // [USB: 0x30] ]} (US Standard 101)
      0xDE: { code: 'Quote', keyCap: '\'' }, // [USB: 0x34] '" (US Standard 101)
      // 0xDF - miscellaneous/varies
  
      // 0xE0 - reserved
      // 0xE1 - OEM specific
      0xE2: { code: 'IntlBackslash',  keyCap: '\\' }, // [USB: 0x64] \| (UK Standard 102)
      // 0xE3-0xE4 - OEM specific
      0xE5: { code: 'Process' }, // (Not in D3E)
      // 0xE6 - OEM specific
      // 0xE7 - VK_PACKET
      // 0xE8 - unassigned
      // 0xE9-0xEF - OEM specific
  
      // 0xF0-0xF5 - OEM specific
      0xF6: { code: 'Attn' }, // [USB: 0x9a] (Not in D3E)
      0xF7: { code: 'CrSel' }, // [USB: 0xa3] (Not in D3E)
      0xF8: { code: 'ExSel' }, // [USB: 0xa4] (Not in D3E)
      0xF9: { code: 'EraseEof' }, // (Not in D3E)
      0xFA: { code: 'Play' }, // (Not in D3E)
      0xFB: { code: 'ZoomToggle' }, // (Not in D3E)
      // 0xFC - VK_NONAME - reserved
      // 0xFD - VK_PA1
      0xFE: { code: 'Clear' } // [USB: 0x9c] (Not in D3E)
    };
  
    // No legacy keyCode, but listed in D3E:
  
    // code: usb
    // 'IntlHash': 0x070032,
    // 'IntlRo': 0x070087,
    // 'IntlYen': 0x070089,
    // 'NumpadBackspace': 0x0700bb,
    // 'NumpadClear': 0x0700d8,
    // 'NumpadClearEntry': 0x0700d9,
    // 'NumpadMemoryAdd': 0x0700d3,
    // 'NumpadMemoryClear': 0x0700d2,
    // 'NumpadMemoryRecall': 0x0700d1,
    // 'NumpadMemoryStore': 0x0700d0,
    // 'NumpadMemorySubtract': 0x0700d4,
    // 'NumpadParenLeft': 0x0700b6,
    // 'NumpadParenRight': 0x0700b7,
  
    //--------------------------------------------------------------------
    //
    // Browser/OS Specific Mappings
    //
    //--------------------------------------------------------------------
  
    mergeIf(keyCodeToInfoTable,
            'moz', {
              0x3B: { code: 'Semicolon', keyCap: ';' }, // [USB: 0x33] ;: (US Standard 101)
              0x3D: { code: 'Equal', keyCap: '=' }, // [USB: 0x2e] =+
              0x6B: { code: 'Equal', keyCap: '=' }, // [USB: 0x2e] =+
              0x6D: { code: 'Minus', keyCap: '-' }, // [USB: 0x2d] -_
              0xBB: { code: 'NumpadAdd', keyCap: '+', location: NUMPAD }, // [USB: 0x57]
              0xBD: { code: 'NumpadSubtract', keyCap: '-', location: NUMPAD } // [USB: 0x56]
            });
  
    mergeIf(keyCodeToInfoTable,
            'moz-mac', {
              0x0C: { code: 'NumLock', location: NUMPAD }, // [USB: 0x53]
              0xAD: { code: 'Minus', keyCap: '-' } // [USB: 0x2d] -_
            });
  
    mergeIf(keyCodeToInfoTable,
            'moz-win', {
              0xAD: { code: 'Minus', keyCap: '-' } // [USB: 0x2d] -_
            });
  
    mergeIf(keyCodeToInfoTable,
            'chrome-mac', {
              0x5D: { code: 'MetaRight', location: RIGHT } // [USB: 0xe7]
            });
  
    // Windows via Bootcamp (!)
    if (0) {
      mergeIf(keyCodeToInfoTable,
              'chrome-win', {
                0xC0: { code: 'Quote', keyCap: '\'' }, // [USB: 0x34] '" (US Standard 101)
                0xDE: { code: 'Backslash',  keyCap: '\\' }, // [USB: 0x31] \| (US Standard 101)
                0xDF: { code: 'Backquote', keyCap: '`' } // [USB: 0x35] `~ (US Standard 101)
              });
  
      mergeIf(keyCodeToInfoTable,
              'ie', {
                0xC0: { code: 'Quote', keyCap: '\'' }, // [USB: 0x34] '" (US Standard 101)
                0xDE: { code: 'Backslash',  keyCap: '\\' }, // [USB: 0x31] \| (US Standard 101)
                0xDF: { code: 'Backquote', keyCap: '`' } // [USB: 0x35] `~ (US Standard 101)
              });
    }
  
    mergeIf(keyCodeToInfoTable,
            'safari', {
              0x03: { code: 'Enter' }, // [USB: 0x28] old Safari
              0x19: { code: 'Tab' } // [USB: 0x2b] old Safari for Shift+Tab
            });
  
    mergeIf(keyCodeToInfoTable,
            'ios', {
              0x0A: { code: 'Enter', location: STANDARD } // [USB: 0x28]
            });
  
    mergeIf(keyCodeToInfoTable,
            'safari-mac', {
              0x5B: { code: 'MetaLeft', location: LEFT }, // [USB: 0xe3]
              0x5D: { code: 'MetaRight', location: RIGHT }, // [USB: 0xe7]
              0xE5: { code: 'KeyQ', keyCap: 'Q' } // [USB: 0x14] On alternate presses, Ctrl+Q sends this
            });
  
    //--------------------------------------------------------------------
    //
    // Identifier Mappings
    //
    //--------------------------------------------------------------------
  
    // Cases where newer-ish browsers send keyIdentifier which can be
    // used to disambiguate keys.
  
    // keyIdentifierTable[keyIdentifier] -> keyInfo
  
    var keyIdentifierTable = {};
    if ('cros' === os) {
      keyIdentifierTable['U+00A0'] = { code: 'ShiftLeft', location: LEFT };
      keyIdentifierTable['U+00A1'] = { code: 'ShiftRight', location: RIGHT };
      keyIdentifierTable['U+00A2'] = { code: 'ControlLeft', location: LEFT };
      keyIdentifierTable['U+00A3'] = { code: 'ControlRight', location: RIGHT };
      keyIdentifierTable['U+00A4'] = { code: 'AltLeft', location: LEFT };
      keyIdentifierTable['U+00A5'] = { code: 'AltRight', location: RIGHT };
    }
    if ('chrome-mac' === browser_os) {
      keyIdentifierTable['U+0010'] = { code: 'ContextMenu' };
    }
    if ('safari-mac' === browser_os) {
      keyIdentifierTable['U+0010'] = { code: 'ContextMenu' };
    }
    if ('ios' === os) {
      // These only generate keyup events
      keyIdentifierTable['U+0010'] = { code: 'Function' };
  
      keyIdentifierTable['U+001C'] = { code: 'ArrowLeft' };
      keyIdentifierTable['U+001D'] = { code: 'ArrowRight' };
      keyIdentifierTable['U+001E'] = { code: 'ArrowUp' };
      keyIdentifierTable['U+001F'] = { code: 'ArrowDown' };
  
      keyIdentifierTable['U+0001'] = { code: 'Home' }; // [USB: 0x4a] Fn + ArrowLeft
      keyIdentifierTable['U+0004'] = { code: 'End' }; // [USB: 0x4d] Fn + ArrowRight
      keyIdentifierTable['U+000B'] = { code: 'PageUp' }; // [USB: 0x4b] Fn + ArrowUp
      keyIdentifierTable['U+000C'] = { code: 'PageDown' }; // [USB: 0x4e] Fn + ArrowDown
    }
  
    //--------------------------------------------------------------------
    //
    // Location Mappings
    //
    //--------------------------------------------------------------------
  
    // Cases where newer-ish browsers send location/keyLocation which
    // can be used to disambiguate keys.
  
    // locationTable[location][keyCode] -> keyInfo
    var locationTable = [];
    locationTable[LEFT] = {
      0x10: { code: 'ShiftLeft', location: LEFT }, // [USB: 0xe1]
      0x11: { code: 'ControlLeft', location: LEFT }, // [USB: 0xe0]
      0x12: { code: 'AltLeft', location: LEFT } // [USB: 0xe2]
    };
    locationTable[RIGHT] = {
      0x10: { code: 'ShiftRight', location: RIGHT }, // [USB: 0xe5]
      0x11: { code: 'ControlRight', location: RIGHT }, // [USB: 0xe4]
      0x12: { code: 'AltRight', location: RIGHT } // [USB: 0xe6]
    };
    locationTable[NUMPAD] = {
      0x0D: { code: 'NumpadEnter', location: NUMPAD } // [USB: 0x58]
    };
  
    mergeIf(locationTable[NUMPAD], 'moz', {
      0x6D: { code: 'NumpadSubtract', location: NUMPAD }, // [USB: 0x56]
      0x6B: { code: 'NumpadAdd', location: NUMPAD } // [USB: 0x57]
    });
    mergeIf(locationTable[LEFT], 'moz-mac', {
      0xE0: { code: 'MetaLeft', location: LEFT } // [USB: 0xe3]
    });
    mergeIf(locationTable[RIGHT], 'moz-mac', {
      0xE0: { code: 'MetaRight', location: RIGHT } // [USB: 0xe7]
    });
    mergeIf(locationTable[RIGHT], 'moz-win', {
      0x5B: { code: 'MetaRight', location: RIGHT } // [USB: 0xe7]
    });
  
  
    mergeIf(locationTable[RIGHT], 'mac', {
      0x5D: { code: 'MetaRight', location: RIGHT } // [USB: 0xe7]
    });
  
    mergeIf(locationTable[NUMPAD], 'chrome-mac', {
      0x0C: { code: 'NumLock', location: NUMPAD } // [USB: 0x53]
    });
  
    mergeIf(locationTable[NUMPAD], 'safari-mac', {
      0x0C: { code: 'NumLock', location: NUMPAD }, // [USB: 0x53]
      0xBB: { code: 'NumpadAdd', location: NUMPAD }, // [USB: 0x57]
      0xBD: { code: 'NumpadSubtract', location: NUMPAD }, // [USB: 0x56]
      0xBE: { code: 'NumpadDecimal', location: NUMPAD }, // [USB: 0x63]
      0xBF: { code: 'NumpadDivide', location: NUMPAD } // [USB: 0x54]
    });
  
  
    //--------------------------------------------------------------------
    //
    // Key Values
    //
    //--------------------------------------------------------------------
  
    // Mapping from `code` values to `key` values. Values defined at:
    // https://w3c.github.io/uievents-key/
    // Entries are only provided when `key` differs from `code`. If
    // printable, `shiftKey` has the shifted printable character. This
    // assumes US Standard 101 layout
  
    var codeToKeyTable = {
      // Modifier Keys
      ShiftLeft: { key: 'Shift' },
      ShiftRight: { key: 'Shift' },
      ControlLeft: { key: 'Control' },
      ControlRight: { key: 'Control' },
      AltLeft: { key: 'Alt' },
      AltRight: { key: 'Alt' },
      MetaLeft: { key: 'Meta' },
      MetaRight: { key: 'Meta' },
  
      // Whitespace Keys
      NumpadEnter: { key: 'Enter' },
      Space: { key: ' ' },
  
      // Printable Keys
      Digit0: { key: '0', shiftKey: ')' },
      Digit1: { key: '1', shiftKey: '!' },
      Digit2: { key: '2', shiftKey: '@' },
      Digit3: { key: '3', shiftKey: '#' },
      Digit4: { key: '4', shiftKey: '$' },
      Digit5: { key: '5', shiftKey: '%' },
      Digit6: { key: '6', shiftKey: '^' },
      Digit7: { key: '7', shiftKey: '&' },
      Digit8: { key: '8', shiftKey: '*' },
      Digit9: { key: '9', shiftKey: '(' },
      KeyA: { key: 'a', shiftKey: 'A' },
      KeyB: { key: 'b', shiftKey: 'B' },
      KeyC: { key: 'c', shiftKey: 'C' },
      KeyD: { key: 'd', shiftKey: 'D' },
      KeyE: { key: 'e', shiftKey: 'E' },
      KeyF: { key: 'f', shiftKey: 'F' },
      KeyG: { key: 'g', shiftKey: 'G' },
      KeyH: { key: 'h', shiftKey: 'H' },
      KeyI: { key: 'i', shiftKey: 'I' },
      KeyJ: { key: 'j', shiftKey: 'J' },
      KeyK: { key: 'k', shiftKey: 'K' },
      KeyL: { key: 'l', shiftKey: 'L' },
      KeyM: { key: 'm', shiftKey: 'M' },
      KeyN: { key: 'n', shiftKey: 'N' },
      KeyO: { key: 'o', shiftKey: 'O' },
      KeyP: { key: 'p', shiftKey: 'P' },
      KeyQ: { key: 'q', shiftKey: 'Q' },
      KeyR: { key: 'r', shiftKey: 'R' },
      KeyS: { key: 's', shiftKey: 'S' },
      KeyT: { key: 't', shiftKey: 'T' },
      KeyU: { key: 'u', shiftKey: 'U' },
      KeyV: { key: 'v', shiftKey: 'V' },
      KeyW: { key: 'w', shiftKey: 'W' },
      KeyX: { key: 'x', shiftKey: 'X' },
      KeyY: { key: 'y', shiftKey: 'Y' },
      KeyZ: { key: 'z', shiftKey: 'Z' },
      Numpad0: { key: '0' },
      Numpad1: { key: '1' },
      Numpad2: { key: '2' },
      Numpad3: { key: '3' },
      Numpad4: { key: '4' },
      Numpad5: { key: '5' },
      Numpad6: { key: '6' },
      Numpad7: { key: '7' },
      Numpad8: { key: '8' },
      Numpad9: { key: '9' },
      NumpadMultiply: { key: '*' },
      NumpadAdd: { key: '+' },
      NumpadComma: { key: ',' },
      NumpadSubtract: { key: '-' },
      NumpadDecimal: { key: '.' },
      NumpadDivide: { key: '/' },
      Semicolon: { key: ';', shiftKey: ':' },
      Equal: { key: '=', shiftKey: '+' },
      Comma: { key: ',', shiftKey: '<' },
      Minus: { key: '-', shiftKey: '_' },
      Period: { key: '.', shiftKey: '>' },
      Slash: { key: '/', shiftKey: '?' },
      Backquote: { key: '`', shiftKey: '~' },
      BracketLeft: { key: '[', shiftKey: '{' },
      Backslash: { key: '\\', shiftKey: '|' },
      BracketRight: { key: ']', shiftKey: '}' },
      Quote: { key: '\'', shiftKey: '"' },
      IntlBackslash: { key: '\\', shiftKey: '|' }
    };
  
    mergeIf(codeToKeyTable, 'mac', {
      MetaLeft: { key: 'Meta' },
      MetaRight: { key: 'Meta' }
    });
  
    // Corrections for 'key' names in older browsers (e.g. FF36-, IE9, etc)
    // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent.key#Key_values
    var keyFixTable = {
      Add: '+',
      Decimal: '.',
      Divide: '/',
      Subtract: '-',
      Multiply: '*',
      Spacebar: ' ',
      Esc: 'Escape',
      Nonconvert: 'NonConvert',
      Left: 'ArrowLeft',
      Up: 'ArrowUp',
      Right: 'ArrowRight',
      Down: 'ArrowDown',
      Del: 'Delete',
      Menu: 'ContextMenu',
      MediaNextTrack: 'MediaTrackNext',
      MediaPreviousTrack: 'MediaTrackPrevious',
      SelectMedia: 'MediaSelect',
      HalfWidth: 'Hankaku',
      FullWidth: 'Zenkaku',
      RomanCharacters: 'Romaji',
      Crsel: 'CrSel',
      Exsel: 'ExSel',
      Zoom: 'ZoomToggle'
    };
  
    //--------------------------------------------------------------------
    //
    // Exported Functions
    //
    //--------------------------------------------------------------------
  
  
    var codeTable = remap(keyCodeToInfoTable, 'code');
  
    try {
      var nativeLocation = nativeKeyboardEvent && ('location' in new KeyboardEvent(''));
    } catch (_) {}
  
    function keyInfoForEvent(event) {
      var keyCode = 'keyCode' in event ? event.keyCode : 'which' in event ? event.which : 0;
      var keyInfo = (function(){
        if (nativeLocation || 'keyLocation' in event) {
          var location = nativeLocation ? event.location : event.keyLocation;
          if (location && keyCode in locationTable[location]) {
            return locationTable[location][keyCode];
          }
        }
        if ('keyIdentifier' in event && event.keyIdentifier in keyIdentifierTable) {
          return keyIdentifierTable[event.keyIdentifier];
        }
        if (keyCode in keyCodeToInfoTable) {
          return keyCodeToInfoTable[keyCode];
        }
        return null;
      }());
  
      // TODO: Track these down and move to general tables
      if (0) {
        // TODO: Map these for newerish browsers?
        // TODO: iOS only?
        // TODO: Override with more common keyIdentifier name?
        switch (event.keyIdentifier) {
        case 'U+0010': keyInfo = { code: 'Function' }; break;
        case 'U+001C': keyInfo = { code: 'ArrowLeft' }; break;
        case 'U+001D': keyInfo = { code: 'ArrowRight' }; break;
        case 'U+001E': keyInfo = { code: 'ArrowUp' }; break;
        case 'U+001F': keyInfo = { code: 'ArrowDown' }; break;
        }
      }
  
      if (!keyInfo)
        return null;
  
      var key = (function() {
        var entry = codeToKeyTable[keyInfo.code];
        if (!entry) return keyInfo.code;
        return (event.shiftKey && 'shiftKey' in entry) ? entry.shiftKey : entry.key;
      }());
  
      return {
        code: keyInfo.code,
        key: key,
        location: keyInfo.location,
        keyCap: keyInfo.keyCap
      };
    }
  
    function queryKeyCap(code, locale) {
      code = String(code);
      if (!codeTable.hasOwnProperty(code)) return 'Undefined';
      if (locale && String(locale).toLowerCase() !== 'en-us') throw Error('Unsupported locale');
      var keyInfo = codeTable[code];
      return keyInfo.keyCap || keyInfo.code || 'Undefined';
    }
  
    if ('KeyboardEvent' in global && 'defineProperty' in Object) {
      (function() {
        function define(o, p, v) {
          if (p in o) return;
          Object.defineProperty(o, p, v);
        }
  
        define(KeyboardEvent.prototype, 'code', { get: function() {
          var keyInfo = keyInfoForEvent(this);
          return keyInfo ? keyInfo.code : '';
        }});
  
        // Fix for nonstandard `key` values (FF36-)
        if ('key' in KeyboardEvent.prototype) {
          var desc = Object.getOwnPropertyDescriptor(KeyboardEvent.prototype, 'key');
          Object.defineProperty(KeyboardEvent.prototype, 'key', { get: function() {
            var key = desc.get.call(this);
            return keyFixTable.hasOwnProperty(key) ? keyFixTable[key] : key;
          }});
        }
  
        define(KeyboardEvent.prototype, 'key', { get: function() {
          var keyInfo = keyInfoForEvent(this);
          return (keyInfo && 'key' in keyInfo) ? keyInfo.key : 'Unidentified';
        }});
  
        define(KeyboardEvent.prototype, 'location', { get: function() {
          var keyInfo = keyInfoForEvent(this);
          return (keyInfo && 'location' in keyInfo) ? keyInfo.location : STANDARD;
        }});
  
        define(KeyboardEvent.prototype, 'locale', { get: function() {
          return '';
        }});
      }());
    }
  
    if (!('queryKeyCap' in global.KeyboardEvent))
      global.KeyboardEvent.queryKeyCap = queryKeyCap;
  
    // Helper for IE8-
    global.identifyKey = function(event) {
      if ('code' in event)
        return;
  
      var keyInfo = keyInfoForEvent(event);
      event.code = keyInfo ? keyInfo.code : '';
      event.key = (keyInfo && 'key' in keyInfo) ? keyInfo.key : 'Unidentified';
      event.location = ('location' in event) ? event.location :
        ('keyLocation' in event) ? event.keyLocation :
        (keyInfo && 'location' in keyInfo) ? keyInfo.location : STANDARD;
      event.locale = '';
    };
  
  }(self));
  
/* global Howler Howl */
(function ctHowler() {
    ct.sound = {};
    ct.sound.howler = Howler;
    Howler.orientation(0, -1, 0, 0, 0, 1);
    Howler.pos(0, 0, 0);
    ct.sound.howl = Howl;

    var defaultMaxDistance = [][0] || 2500;
    ct.sound.useDepth = [false][0] === void 0 ?
        false :
        [false][0];
    ct.sound.manageListenerPosition = [false][0] === void 0 ?
        true :
        [false][0];

    /**
     * Detects if a particular codec is supported in the system
     * @param {string} type One of: "mp3", "mpeg", "opus", "ogg", "oga", "wav",
     * "aac", "caf", m4a", "mp4", "weba", "webm", "dolby", "flac".
     * @returns {boolean} true/false
     */
    ct.sound.detect = Howler.codecs;

    /**
     * Creates a new Sound object and puts it in resource object
     *
     * @param {string} name Sound's name
     * @param {object} formats A collection of sound files of specified extension,
     * in format `extension: path`
     * @param {string} [formats.ogg] Local path to the sound in ogg format
     * @param {string} [formats.wav] Local path to the sound in wav format
     * @param {string} [formats.mp3] Local path to the sound in mp3 format
     * @param {object} options An options object
     *
     * @returns {object} Sound's object
     */
    ct.sound.init = function init(name, formats, options) {
        options = options || {};
        var sounds = [];
        if (formats.wav && formats.wav.slice(-4) === '.wav') {
            sounds.push(formats.wav);
        }
        if (formats.mp3 && formats.mp3.slice(-4) === '.mp3') {
            sounds.push(formats.mp3);
        }
        if (formats.ogg && formats.ogg.slice(-4) === '.ogg') {
            sounds.push(formats.ogg);
        }
        // Do not use music preferences for ct.js debugger
        var isMusic = !navigator.userAgent.startsWith('ct.js') && options.music;
        var howl = new Howl({
            src: sounds,
            autoplay: false,
            preload: !isMusic,
            html5: isMusic,
            loop: options.loop,
            pool: options.poolSize || 5,

            onload: function () {
                if (!isMusic) {
                    ct.res.soundsLoaded++;
                }
            },
            onloaderror: function () {
                ct.res.soundsError++;
                howl.buggy = true;
                console.error('[ct.sound.howler] Oh no! We couldn\'t load ' +
                    (formats.wav || formats.mp3 || formats.ogg) + '!');
            }
        });
        if (isMusic) {
            ct.res.soundsLoaded++;
        }
        ct.res.sounds[name] = howl;
    };

    var set3Dparameters = (howl, opts, id) => {
        howl.pannerAttr({
            coneInnerAngle: opts.coneInnerAngle || 360,
            coneOuterAngle: opts.coneOuterAngle || 360,
            coneOuterGain: opts.coneOuterGain || 1,
            distanceModel: opts.distanceModel || 'linear',
            maxDistance: opts.maxDistance || defaultMaxDistance,
            refDistance: opts.refDistance || 1,
            rolloffFactor: opts.rolloffFactor || 1,
            panningModel: opts.panningModel || 'HRTF'
        }, id);
    };
    /**
     * Spawns a new sound and plays it.
     *
     * @param {string} name The name of a sound to be played
     * @param {object} [opts] Options object.
     * @param {Function} [cb] A callback, which is called when the sound finishes playing
     *
     * @returns {number} The ID of the created sound. This can be passed to Howler methods.
     */
    ct.sound.spawn = function spawn(name, opts, cb) {
        opts = opts || {};
        if (typeof opts === 'function') {
            cb = opts;
            opts = {};
        }
        var howl = ct.res.sounds[name];
        var id = howl.play();
        if (opts.loop) {
            howl.loop(true, id);
        }
        if (opts.volume !== void 0) {
            howl.volume(opts.volume, id);
        }
        if (opts.rate !== void 0) {
            howl.rate(opts.rate, id);
        }
        if (opts.x !== void 0 || opts.position) {
            if (opts.x !== void 0) {
                howl.pos(opts.x, opts.y || 0, opts.z || 0, id);
            } else {
                const copy = opts.position;
                howl.pos(copy.x, copy.y, opts.z || (ct.sound.useDepth ? copy.depth : 0), id);
            }
            set3Dparameters(howl, opts, id);
        }
        if (cb) {
            howl.once('end', cb, id);
        }
        return id;
    };

    /**
     * Stops playback of a sound, resetting its time to 0.
     *
     * @param {string} name The name of a sound
     * @param {number} [id] An optional ID of a particular sound
     * @returns {void}
     */
    ct.sound.stop = function stop(name, id) {
        if (ct.sound.playing(name, id)) {
            ct.res.sounds[name].stop(id);
        }
    };

    /**
     * Pauses playback of a sound or group, saving the seek of playback.
     *
     * @param {string} name The name of a sound
     * @param {number} [id] An optional ID of a particular sound
     * @returns {void}
     */
    ct.sound.pause = function pause(name, id) {
        ct.res.sounds[name].pause(id);
    };

    /**
     * Resumes a given sound, e.g. after pausing it.
     *
     * @param {string} name The name of a sound
     * @param {number} [id] An optional ID of a particular sound
     * @returns {void}
     */
    ct.sound.resume = function resume(name, id) {
        ct.res.sounds[name].play(id);
    };
    /**
     * Returns whether a sound is currently playing,
     * either an exact sound (found by its ID) or any sound of a given name.
     *
     * @param {string} name The name of a sound
     * @param {number} [id] An optional ID of a particular sound
     * @returns {boolean} `true` if the sound is playing, `false` otherwise.
     */
    ct.sound.playing = function playing(name, id) {
        return ct.res.sounds[name].playing(id);
    };
    /**
     * Preloads a sound. This is usually applied to music files before playing
     * as they are not preloaded by default.
     *
     * @param {string} name The name of a sound
     * @returns {void}
     */
    ct.sound.load = function load(name) {
        ct.res.sounds[name].load();
    };


    /**
     * Changes/returns the volume of the given sound.
     *
     * @param {string} name The name of a sound to affect.
     * @param {number} [volume] The new volume from `0.0` to `1.0`.
     * If empty, will return the existing volume.
     * @param {number} [id] If specified, then only the given sound instance is affected.
     *
     * @returns {number} The current volume of the sound.
     */
    ct.sound.volume = function volume(name, volume, id) {
        return ct.res.sounds[name].volume(volume, id);
    };

    /**
     * Fades a sound to a given volume. Can affect either a specific instance or the whole group.
     *
     * @param {string} name The name of a sound to affect.
     * @param {number} newVolume The new volume from `0.0` to `1.0`.
     * @param {number} duration The duration of transition, in milliseconds.
     * @param {number} [id] If specified, then only the given sound instance is affected.
     *
     * @returns {void}
     */
    ct.sound.fade = function fade(name, newVolume, duration, id) {
        if (ct.sound.playing(name, id)) {
            var howl = ct.res.sounds[name],
                oldVolume = id ? howl.volume(id) : howl.volume;
            try {
                howl.fade(oldVolume, newVolume, duration, id);
            } catch (e) {
                // eslint-disable-next-line no-console
                console.warn('Could not reliably fade a sound, reason:', e);
                ct.sound.volume(name, newVolume, id);
            }
        }
    };

    /**
     * Moves the 3D listener to a new position.
     *
     * @see https://github.com/goldfire/howler.js#posx-y-z
     *
     * @param {number} x The new x coordinate
     * @param {number} y The new y coordinate
     * @param {number} [z] The new z coordinate
     *
     * @returns {void}
     */
    ct.sound.moveListener = function moveListener(x, y, z) {
        Howler.pos(x, y, z || 0);
    };

    /**
     * Moves a 3D sound to a new location
     *
     * @param {string} name The name of a sound to move
     * @param {number} id The ID of a particular sound.
     * Pass `null` if you want to affect all the sounds of a given name.
     * @param {number} x The new x coordinate
     * @param {number} y The new y coordinate
     * @param {number} [z] The new z coordinate
     *
     * @returns {void}
     */
    ct.sound.position = function position(name, id, x, y, z) {
        if (ct.sound.playing(name, id)) {
            var howl = ct.res.sounds[name],
                oldPosition = howl.pos(id);
            howl.pos(x, y, z || oldPosition[2], id);
        }
    };

    /**
     * Get/set the global volume for all sounds, relative to their own volume.
     * @param {number} [volume] The new volume from `0.0` to `1.0`.
     * If omitted, will return the current global volume.
     *
     * @returns {number} The current volume.
     */
    ct.sound.globalVolume = Howler.volume.bind(Howler);

    ct.sound.exists = function exists(name) {
        return (name in ct.res.sounds);
    };
})();

/* Based on https://github.com/luser/gamepadtest */

(function ctGamepad() {
    const standardMapping = {
        controllers: {},
        buttonsMapping: [
            'Button1',
            'Button2',
            'Button3',
            'Button4',
            'L1',
            'R1',
            'L2',
            'R2',
            'Select',
            'Start',
      // here, must have same name as in module.js
            'L3',
      //'LStickButton',
      // here, too...
            'R3',
      //'RStickButton',
      // up, down, left and right are all mapped as axes.
            'Up',
            'Down',
            'Left',
            'Right'

      // + a special button code `Any`, that requires special handling
        ],
        axesMapping: ['LStickX', 'LStickY', 'RStickX', 'RStickY']
    };

    const prefix = 'gamepad.';

    const setRegistry = function (key, value) {
        ct.inputs.registry[prefix + key] = value;
    };
    const getRegistry = function (key) {
        return ct.inputs.registry[prefix + key] || 0;
    };

    const getGamepads = function () {
        if (navigator.getGamepads) {
            return navigator.getGamepads();
        }
        return [];
    };

    const addGamepad = function (gamepad) {
        standardMapping.controllers[gamepad.index] = gamepad;
    };

    const scanGamepads = function () {
        const gamepads = getGamepads();
        for (let i = 0, len = gamepads.length; i < len; i++) {
            if (gamepads[i]) {
                const {controllers} = standardMapping;
                if (!(gamepads[i].index in controllers)) {
          // add new gamepad object
                    addGamepad(gamepads[i]);
                } else {
          // update gamepad object state
                    controllers[gamepads[i].index] = gamepads[i];
                }
            }
        }
    };

    const updateStatus = function () {
        scanGamepads();
        let j;
        const {controllers} = standardMapping;
        const {buttonsMapping} = standardMapping;
        const {axesMapping} = standardMapping;
        for (j in controllers) {
      /**
       * @type {Gamepad}
       */
            const controller = controllers[j];
            const buttonsLen = controller.buttons.length;

      // Reset the 'any button' input
            setRegistry('Any', 0);
      // loop through all the known button codes and update their state
            for (let i = 0; i < buttonsLen; i++) {
                setRegistry(buttonsMapping[i], controller.buttons[i].value);
        // update the 'any button', if needed
                setRegistry('Any', Math.max(getRegistry('Any'), controller.buttons[i].value));
                ct.gamepad.lastButton = buttonsMapping[i];
            }

      // loop through all the known axes and update their state
            const axesLen = controller.axes.length;
            for (let i = 0; i < axesLen; i++) {
                setRegistry(axesMapping[i], controller.axes[i]);
            }
        }
    };

    ct.gamepad = Object.assign(new PIXI.utils.EventEmitter(), {
        list: getGamepads(),
        connected(e) {
            ct.gamepad.emit('connected', e.gamepad, e);
            addGamepad(e.gamepad);
        },
        disconnected(e) {
            ct.gamepad.emit('disconnected', e.gamepad, e);
            delete standardMapping.controllers[e.gamepad.index];
        },
        getButton: code => {
            if (standardMapping.buttonsMapping.indexOf(code) === -1 && code !== 'Any') {
                throw new Error(`[ct.gamepad] Attempt to get the state of a non-existing button ${code}. A typo?`);
            }
            return getRegistry(code);
        },
        getAxis: code => {
            if (standardMapping.axesMapping.indexOf(code) === -1) {
                throw new Error(`[ct.gamepad] Attempt to get the state of a non-existing axis ${code}. A typo?`);
            }
            return getRegistry(code);
        },
        lastButton: null
    });

  // register events
    window.addEventListener('gamepadconnected', ct.gamepad.connected);
    window.addEventListener('gamepaddisconnected', ct.gamepad.disconnected);
  // register a ticker listener
    ct.pixiApp.ticker.add(updateStatus);
})();

(function ctVkeys() {
    ct.vkeys = {
        button(options) {
            var opts = ct.u.ext({
                key: 'Vk1',
                depth: 100,
                texNormal: -1,
                x: 128,
                y: 128,
                container: ct.room
            }, options || {});
            const copy = ct.templates.copy('VKEY', 0, 0, {
                opts: opts
            }, opts.container);
            if (typeof options.x === 'function' || typeof options.y === 'function') {
                copy.skipRealign = true;
            }
            return copy;
        },
        joystick(options) {
            var opts = ct.u.ext({
                key: 'Vjoy1',
                depth: 100,
                tex: -1,
                trackballTex: -1,
                x: 128,
                y: 128,
                container: ct.room
            }, options || {});
            const copy = ct.templates.copy('VJOYSTICK', 0, 0, {
                opts: opts
            }, opts.container);
            if (typeof options.x === 'function' || typeof options.y === 'function') {
                copy.skipRealign = true;
            }
            return copy;
        }
    };
})();

(function ctTransition() {
    const makeGenericTransition = function makeGenericTransition(name, exts) {
        ct.rooms.templates.CTTRANSITIONEMPTYROOM.width = ct.camera.width;
        ct.rooms.templates.CTTRANSITIONEMPTYROOM.height = ct.camera.height;
        const room = ct.rooms.append('CTTRANSITIONEMPTYROOM', {
            isUi: true
        });
        const transition = ct.templates.copyIntoRoom(
            name, 0, 0, room,
            Object.assign({
                room
            }, exts)
        );
        return transition.promise;
    };
    ct.transition = {
        fadeOut(duration, color) {
            duration = duration || 500;
            color = color || 0x000000; // Defaults to a black color
            return makeGenericTransition('CTTRANSITION_FADE', {
                duration,
                color,
                in: false
            });
        },
        fadeIn(duration, color) {
            duration = duration || 500;
            color = color || 0x000000; // Defaults to a black color
            return makeGenericTransition('CTTRANSITION_FADE', {
                duration,
                color,
                in: true
            });
        },
        scaleOut(duration, scaling, color) {
            duration = duration || 500;
            scaling = scaling || 0.1;
            color = color || 0x000000; // Defaults to a black color
            return makeGenericTransition('CTTRANSITION_SCALE', {
                duration,
                color,
                scaling,
                in: false
            });
        },
        scaleIn(duration, scaling, color) {
            duration = duration || 500;
            scaling = scaling || 0.1;
            color = color || 0x000000; // Defaults to a black color
            return makeGenericTransition('CTTRANSITION_SCALE', {
                duration,
                color,
                scaling,
                in: true
            });
        },
        slideOut(duration, direction, color) {
            duration = duration || 500;
            direction = direction || 'right';
            color = color || 0x000000; // Defaults to a black color
            return makeGenericTransition('CTTRANSITION_SLIDE', {
                duration,
                color,
                endAt: direction,
                in: false
            });
        },
        slideIn(duration, direction, color) {
            duration = duration || 500;
            direction = direction || 'right';
            color = color || 0x000000; // Defaults to a black color
            return makeGenericTransition('CTTRANSITION_SLIDE', {
                duration,
                color,
                endAt: direction,
                in: true
            });
        },
        circleOut(duration, color) {
            color = color || 0x000000; // Defaults to a black color
            return makeGenericTransition('CTTRANSITION_CIRCLE', {
                duration,
                color,
                in: true
            });
        },
        circleIn(duration, color) {
            color = color || 0x000000; // Defaults to a black color
            return makeGenericTransition('CTTRANSITION_CIRCLE', {
                duration,
                color,
                in: false
            });
        }
    };
})();


/* eslint-disable no-nested-ternary */
/* global CtTimer */

ct.tween = {
    /**
     * Creates a new tween effect and adds it to the game loop
     *
     * @param {Object} options An object with options:
     * @param {Object|Copy} options.obj An object to animate. All objects are supported.
     * @param {Object} options.fields A map with pairs `fieldName: newValue`.
     * Values must be of numerical type.
     * @param {Function} options.curve An interpolating function. You can write your own,
     * or use default ones (see methods in `ct.tween`). The default one is `ct.tween.ease`.
     * @param {Number} options.duration The duration of easing, in milliseconds.
     * @param {Number} options.useUiDelta If true, use ct.deltaUi instead of ct.delta.
     * The default is `false`.
     * @param {boolean} options.silent If true, will not throw errors if the animation
     * was interrupted.
     *
     * @returns {Promise} A promise which is resolved if the effect was fully played,
     * or rejected if it was interrupted manually by code, room switching or instance kill.
     * You can call a `stop()` method on this promise to interrupt it manually.
     */
    add(options) {
        var tween = {
            obj: options.obj,
            fields: options.fields || {},
            curve: options.curve || ct.tween.ease,
            duration: options.duration || 1000,
            timer: new CtTimer(this.duration, false, options.useUiDelta || false)
        };
        var promise = new Promise((resolve, reject) => {
            tween.resolve = resolve;
            tween.reject = reject;
            tween.starting = {};
            for (var field in tween.fields) {
                tween.starting[field] = tween.obj[field] || 0;
            }
            ct.tween.tweens.push(tween);
        });
        if (options.silent) {
            promise.catch(() => void 0);
            tween.timer.catch(() => void 0);
        }
        promise.stop = function stop() {
            tween.reject({
                code: 0,
                info: 'Stopped by game logic',
                from: 'ct.tween'
            });
        };
        return promise;
    },
    /**
     * Linear interpolation.
     * Here and below, these parameters are used:
     *
     * @param {Number} s Starting value
     * @param {Number} d The change of value to transition to, the Delta
     * @param {Number} a The current timing state, 0-1
     * @returns {Number} Interpolated value
     */
    linear(s, d, a) {
        return d * a + s;
    },
    ease(s, d, a) {
        a *= 2;
        if (a < 1) {
            return d / 2 * a * a + s;
        }
        a--;
        return -d / 2 * (a * (a - 2) - 1) + s;
    },
    easeInQuad(s, d, a) {
        return d * a * a + s;
    },
    easeOutQuad(s, d, a) {
        return -d * a * (a - 2) + s;
    },
    easeInCubic(s, d, a) {
        return d * a * a * a + s;
    },
    easeOutCubic(s, d, a) {
        a--;
        return d * (a * a * a + 1) + s;
    },
    easeInOutCubic(s, d, a) {
        a *= 2;
        if (a < 1) {
            return d / 2 * a * a * a + s;
        }
        a -= 2;
        return d / 2 * (a * a * a + 2) + s;
    },
    easeInOutQuart(s, d, a) {
        a *= 2;
        if (a < 1) {
            return d / 2 * a * a * a * a + s;
        }
        a -= 2;
        return -d / 2 * (a * a * a * a - 2) + s;
    },
    easeInQuart(s, d, a) {
        return d * a * a * a * a + s;
    },
    easeOutQuart(s, d, a) {
        a--;
        return -d * (a * a * a * a - 1) + s;
    },
    easeInCirc(s, d, a) {
        return -d * (Math.sqrt(1 - a * a) - 1) + s;
    },
    easeOutCirc(s, d, a) {
        a--;
        return d * Math.sqrt(1 - a * a) + s;
    },
    easeInOutCirc(s, d, a) {
        a *= 2;
        if (a < 1) {
            return -d / 2 * (Math.sqrt(1 - a * a) - 1) + s;
        }
        a -= 2;
        return d / 2 * (Math.sqrt(1 - a * a) + 1) + s;
    },
    easeInBack(s, d, a) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        var x = c3 * a * a * a - c1 * a * a;
        return d * x + s;
    },
    easeOutBack(s, d, a) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        var x = 1 + c3 * (a - 1) ** 3 + c1 * (a - 1) ** 2;
        return d * x + s;
    },
    easeInOutBack(s, d, a) {
        const c1 = 1.70158;
        const c2 = c1 * 1.525;
        var x = a < 0.5 ?
            ((2 * a) ** 2 * ((c2 + 1) * 2 * a - c2)) / 2 :
            ((2 * a - 2) ** 2 * ((c2 + 1) * (a * 2 - 2) + c2) + 2) / 2;
        return d * x + s;
    },
    easeInElastic(s, d, a) {
        const c4 = (2 * Math.PI) / 3;
        var x = a === 0 ?
            0 :
            a === 1 ?
                1 :
                -(2 ** (10 * a - 10)) * Math.sin((a * 10 - 10.75) * c4);
        return d * x + s;
    },
    easeOutElastic(s, d, a) {
        const c4 = (2 * Math.PI) / 3;
        var x = a === 0 ?
            0 :
            a === 1 ?
                1 :
                2 ** (-10 * a) * Math.sin((a * 10 - 0.75) * c4) + 1;
        return d * x + s;
    },
    easeInOutElastic(s, d, a) {
        const c5 = (2 * Math.PI) / 4.5;
        var x = a === 0 ?
            0 :
            a === 1 ?
                1 :
                a < 0.5 ?
                    -(2 ** (20 * a - 10) * Math.sin((20 * a - 11.125) * c5)) / 2 :
                    (2 ** (-20 * a + 10) * Math.sin((20 * a - 11.125) * c5)) / 2 + 1;
        return d * x + s;
    },
    easeOutBounce(s, d, a) {
        const n1 = 7.5625;
        const d1 = 2.75;
        var x;
        if (a < 1 / d1) {
            x = n1 * a * a;
        } else if (a < 2 / d1) {
            x = n1 * (a -= 1.5 / d1) * a + 0.75;
        } else if (a < 2.5 / d1) {
            x = n1 * (a -= 2.25 / d1) * a + 0.9375;
        } else {
            x = n1 * (a -= 2.625 / d1) * a + 0.984375;
        }
        return d * x + s;
    },
    easeInBounce(s, d, a) {
        const n1 = 7.5625;
        const d1 = 2.75;
        var x;
        a = 1 - a;
        if (a < 1 / d1) {
            x = n1 * a * a;
        } else if (a < 2 / d1) {
            x = n1 * (a -= 1.5 / d1) * a + 0.75;
        } else if (a < 2.5 / d1) {
            x = n1 * (a -= 2.25 / d1) * a + 0.9375;
        } else {
            x = n1 * (a -= 2.625 / d1) * a + 0.984375;
        }
        return d * (1 - x) + s;
    },
    easeInOutBounce(s, d, a) {
        const n1 = 7.5625;
        const d1 = 2.75;
        var x, b;
        if (a < 0.5) {
            b = 1 - 2 * a;
        } else {
            b = 2 * a - 1;
        }
        if (b < 1 / d1) {
            x = n1 * b * b;
        } else if (b < 2 / d1) {
            x = n1 * (b -= 1.5 / d1) * b + 0.75;
        } else if (b < 2.5 / d1) {
            x = n1 * (b -= 2.25 / d1) * b + 0.9375;
        } else {
            x = n1 * (b -= 2.625 / d1) * b + 0.984375;
        }
        if (a < 0.5) {
            x = (1 - b) / 1;
        } else {
            x = (1 + b) / 1;
        }
        return d * x + s;
    },
    tweens: [],
    wait: ct.u.wait
};
ct.tween.easeInOutQuad = ct.tween.ease;

(function mountCtPointer(ct) {
    const keyPrefix = 'pointer.';
    const setKey = function (key, value) {
        ct.inputs.registry[keyPrefix + key] = value;
    };
    const getKey = function (key) {
        return ct.inputs.registry[keyPrefix + key];
    };
    const buttonMappings = {
        Primary: 1,
        Middle: 4,
        Secondary: 2,
        ExtraOne: 8,
        ExtraTwo: 16,
        Eraser: 32
    };
    var lastPanNum = 0,
        lastPanX = 0,
        lastPanY = 0,
        lastScaleDistance = 0,
        lastAngle = 0;

    // updates Action system's input methods for singular, double and triple pointers
    var countPointers = () => {
        setKey('Any', ct.pointer.down.length > 0 ? 1 : 0);
        setKey('Double', ct.pointer.down.length > 1 ? 1 : 0);
        setKey('Triple', ct.pointer.down.length > 2 ? 1 : 0);
    };
    // returns a new object with the necessary information about a pointer event
    var copyPointer = e => {
        const rect = ct.pixiApp.view.getBoundingClientRect();
        const xui = (e.clientX - rect.left) / rect.width * ct.camera.width,
              yui = (e.clientY - rect.top) / rect.height * ct.camera.height;
        const positionGame = ct.u.uiToGameCoord(xui, yui);
        const pointer = {
            id: e.pointerId,
            x: positionGame.x,
            y: positionGame.y,
            clientX: e.clientX,
            clientY: e.clientY,
            xui: xui,
            yui: yui,
            xprev: positionGame.x,
            yprev: positionGame.y,
            buttons: e.buttons,
            xuiprev: xui,
            yuiprev: yui,
            pressure: e.pressure,
            tiltX: e.tiltX,
            tiltY: e.tiltY,
            twist: e.twist,
            type: e.pointerType,
            width: e.width / rect.width * ct.camera.width,
            height: e.height / rect.height * ct.camera.height
        };
        return pointer;
    };
    var updatePointer = (pointer, e) => {
        const rect = ct.pixiApp.view.getBoundingClientRect();
        const xui = (e.clientX - rect.left) / rect.width * ct.camera.width,
              yui = (e.clientY - rect.top) / rect.height * ct.camera.height;
        const positionGame = ct.u.uiToGameCoord(xui, yui);
        Object.assign(pointer, {
            x: positionGame.x,
            y: positionGame.y,
            xui: xui,
            yui: yui,
            clientX: e.clientX,
            clientY: e.clientY,
            pressure: e.pressure,
            buttons: e.buttons,
            tiltX: e.tiltX,
            tiltY: e.tiltY,
            twist: e.twist,
            width: e.width / rect.width * ct.camera.width,
            height: e.height / rect.height * ct.camera.height
        });
    };
    var writePrimary = function (pointer) {
        Object.assign(ct.pointer, {
            x: pointer.x,
            y: pointer.y,
            xui: pointer.xui,
            yui: pointer.yui,
            pressure: pointer.pressure,
            buttons: pointer.buttons,
            tiltX: pointer.tiltX,
            tiltY: pointer.tiltY,
            twist: pointer.twist
        });
    };

    var handleHoverStart = function (e) {
        window.focus();
        const pointer = copyPointer(e);
        ct.pointer.hover.push(pointer);
        if (e.isPrimary) {
            writePrimary(pointer);
        }
    };
    var handleHoverEnd = function (e) {
        const pointer = ct.pointer.hover.find(p => p.id === e.pointerId);
        if (pointer) {
            pointer.invalid = true;
            ct.pointer.hover.splice(ct.pointer.hover.indexOf(pointer), 1);
        }
        // Handles mouse pointers that were dragged out of the ct.js frame while pressing,
        // as they don't trigger pointercancel or such
        const downId = ct.pointer.down.findIndex(p => p.id === e.pointerId);
        if (downId !== -1) {
            ct.pointer.down.splice(downId, 1);
        }
    };
    var handleMove = function (e) {
        if (![false][0]) {
            e.preventDefault();
        }
        let pointerHover = ct.pointer.hover.find(p => p.id === e.pointerId);
        if (!pointerHover) {
            // Catches hover events that started before the game has loaded
            handleHoverStart(e);
            pointerHover = ct.pointer.hover.find(p => p.id === e.pointerId);
        }
        const pointerDown = ct.pointer.down.find(p => p.id === e.pointerId);
        if (!pointerHover && !pointerDown) {
            return;
        }
        if (pointerHover) {
            updatePointer(pointerHover, e);
        }
        if (pointerDown) {
            updatePointer(pointerDown, e);
        }
        if (e.isPrimary) {
            writePrimary(pointerHover || pointerDown);
        }
    };
    var handleDown = function (e) {
        if (![false][0]) {
            e.preventDefault();
        }
        ct.pointer.type = e.pointerType;
        const pointer = copyPointer(e);
        ct.pointer.down.push(pointer);
        countPointers();
        if (e.isPrimary) {
            writePrimary(pointer);
        }
    };
    var handleUp = function (e) {
        if (![false][0]) {
            e.preventDefault();
        }
        const pointer = ct.pointer.down.find(p => p.id === e.pointerId);
        if (pointer) {
            ct.pointer.released.push(pointer);
        }
        if (ct.pointer.down.indexOf(pointer) !== -1) {
            ct.pointer.down.splice(ct.pointer.down.indexOf(pointer), 1);
        }
        countPointers();
    };
    var handleWheel = function handleWheel(e) {
        setKey('Wheel', ((e.wheelDelta || -e.detail) < 0) ? -1 : 1);
        if (![false][0]) {
            e.preventDefault();
        }
    };

    let locking = false;
    const genericCollisionCheck = function genericCollisionCheck(
        copy,
        specificPointer,
        set,
        uiSpace
    ) {
        if (locking) {
            return false;
        }
        for (const pointer of set) {
            if (specificPointer && pointer.id !== specificPointer.id) {
                continue;
            }
            if (ct.place.collide(copy, {
                x: uiSpace ? pointer.xui : pointer.x,
                y: uiSpace ? pointer.yui : pointer.y,
                scale: {
                    x: 1,
                    y: 1
                },
                angle: 0,
                shape: {
                    type: 'rect',
                    top: pointer.height / 2,
                    bottom: pointer.height / 2,
                    left: pointer.width / 2,
                    right: pointer.width / 2
                }
            })) {
                return pointer;
            }
        }
        return false;
    };
    // Triggers on every mouse press event to capture pointer after it was released by a user,
    // e.g. after the window was blurred
    const pointerCapturer = function pointerCapturer() {
        if (!document.pointerLockElement && !document.mozPointerLockElement) {
            const request = document.body.requestPointerLock || document.body.mozRequestPointerLock;
            request.apply(document.body);
        }
    };
    const capturedPointerMove = function capturedPointerMove(e) {
        const rect = ct.pixiApp.view.getBoundingClientRect();
        const dx = e.movementX / rect.width * ct.camera.width,
              dy = e.movementY / rect.height * ct.camera.height;
        ct.pointer.xlocked += dx;
        ct.pointer.ylocked += dy;
        ct.pointer.xmovement = dx;
        ct.pointer.ymovement = dy;
    };

    ct.pointer = {
        setupListeners() {
            document.addEventListener('pointerenter', handleHoverStart, false);
            document.addEventListener('pointerout', handleHoverEnd, false);
            document.addEventListener('pointerleave', handleHoverEnd, false);
            document.addEventListener('pointerdown', handleDown, false);
            document.addEventListener('pointerup', handleUp, false);
            document.addEventListener('pointercancel', handleUp, false);
            document.addEventListener('pointermove', handleMove, false);
            document.addEventListener('wheel', handleWheel, {
                passive: false
            });
            document.addEventListener('DOMMouseScroll', handleWheel, {
                passive: false
            });
            document.addEventListener('contextmenu', e => {
                if (![false][0]) {
                    e.preventDefault();
                }
            });
        },
        hover: [],
        down: [],
        released: [],
        x: 0,
        y: 0,
        xprev: 0,
        yprev: 0,
        xui: 0,
        yui: 0,
        xuiprev: 0,
        yuiprev: 0,
        xlocked: 0,
        ylocked: 0,
        xmovement: 0,
        ymovement: 0,
        pressure: 1,
        buttons: 0,
        tiltX: 0,
        tiltY: 0,
        twist: 0,
        width: 1,
        height: 1,
        type: null,
        clear() {
            ct.pointer.down.length = 0;
            ct.pointer.hover.length = 0;
            ct.pointer.clearReleased();
            countPointers();
        },
        clearReleased() {
            ct.pointer.released.length = 0;
        },
        collides(copy, pointer, checkReleased) {
            var set = checkReleased ? ct.pointer.released : ct.pointer.down;
            return genericCollisionCheck(copy, pointer, set, false);
        },
        collidesUi(copy, pointer, checkReleased) {
            var set = checkReleased ? ct.pointer.released : ct.pointer.down;
            return genericCollisionCheck(copy, pointer, set, true);
        },
        hovers(copy, pointer) {
            return genericCollisionCheck(copy, pointer, ct.pointer.hover, false);
        },
        hoversUi(copy, pointer) {
            return genericCollisionCheck(copy, pointer, ct.pointer.hover, true);
        },
        isButtonPressed(button, pointer) {
            if (!pointer) {
                return Boolean(getKey(button));
            }
            // eslint-disable-next-line no-bitwise
            return (pointer.buttons & buttonMappings[button]) === button ? 1 : 0;
        },
        updateGestures() {
            let x = 0,
                y = 0;
            const rect = ct.pixiApp.view.getBoundingClientRect();
            // Get the middle point of all the pointers
            for (const event of ct.pointer.down) {
                x += (event.clientX - rect.left) / rect.width;
                y += (event.clientY - rect.top) / rect.height;
            }
            x /= ct.pointer.down.length;
            y /= ct.pointer.down.length;

            let angle = 0,
                distance = lastScaleDistance;
            if (ct.pointer.down.length > 1) {
                const events = [
                    ct.pointer.down[0],
                    ct.pointer.down[1]
                ].sort((a, b) => a.id - b.id);
                angle = ct.u.pdn(
                    events[0].x,
                    events[0].y,
                    events[1].x,
                    events[1].y
                );
                distance = ct.u.pdc(
                    events[0].x,
                    events[0].y,
                    events[1].x,
                    events[1].y
                );
            }
            if (lastPanNum === ct.pointer.down.length) {
                if (ct.pointer.down.length > 1) {
                    setKey('DeltaRotation', (ct.u.degToRad(ct.u.deltaDir(lastAngle, angle))));
                    setKey('DeltaPinch', distance / lastScaleDistance - 1);
                } else {
                    setKey('DeltaPinch', 0);
                    setKey('DeltaRotation', 0);
                }
                if (!ct.pointer.down.length) {
                    setKey('PanX', 0);
                    setKey('PanY', 0);
                } else {
                    setKey('PanX', x - lastPanX);
                    setKey('PanY', y - lastPanY);
                }
            } else {
                // skip gesture updates to avoid shaking on new presses
                lastPanNum = ct.pointer.down.length;
                setKey('DeltaPinch', 0);
                setKey('DeltaRotation', 0);
                setKey('PanX', 0);
                setKey('PanY', 0);
            }
            lastPanX = x;
            lastPanY = y;
            lastAngle = angle;
            lastScaleDistance = distance;

            for (const button in buttonMappings) {
                setKey(button, 0);
                for (const pointer of ct.pointer.down) {
                    // eslint-disable-next-line no-bitwise
                    if ((pointer.buttons & buttonMappings[button]) === buttonMappings[button]) {
                        setKey(button, 1);
                    }
                }
            }
        },
        lock() {
            if (locking) {
                return;
            }
            locking = true;
            ct.pointer.xlocked = ct.pointer.xui;
            ct.pointer.ylocked = ct.pointer.yui;
            const request = document.body.requestPointerLock || document.body.mozRequestPointerLock;
            request.apply(document.body);
            document.addEventListener('click', pointerCapturer);
            document.addEventListener('pointermove', capturedPointerMove);
        },
        unlock() {
            if (!locking) {
                return;
            }
            locking = false;
            if (document.pointerLockElement || document.mozPointerLockElement) {
                (document.exitPointerLock || document.mozExitPointerLock)();
            }
            document.removeEventListener('click', pointerCapturer);
            document.removeEventListener('pointermove', capturedPointerMove);
        },
        get locked() {
            // Do not return the Document object
            return Boolean(document.pointerLockElement || document.mozPointerLockElement);
        }
    };
    setKey('Wheel', 0);
    if ([false][0]) {
        ct.pointer.lock();
    }
})(ct);

(function fittoscreen(ct) {
    document.body.style.overflow = 'hidden';
    var canv = ct.pixiApp.view;
    const positionCanvas = function positionCanvas(mode, scale) {
        if (mode === 'fastScale' || mode === 'fastScaleInteger') {
            canv.style.transform = `translate(-50%, -50%) scale(${scale})`;
            canv.style.position = 'absolute';
            canv.style.top = '50%';
            canv.style.left = '50%';
        } else if (mode === 'expandViewport' || mode === 'expand' || mode === 'scaleFill') {
            canv.style.position = 'static';
            canv.style.top = 'unset';
            canv.style.left = 'unset';
        } else if (mode === 'scaleFit') {
            canv.style.transform = 'translate(-50%, -50%)';
            canv.style.position = 'absolute';
            canv.style.top = '50%';
            canv.style.left = '50%';
        }
    };
    var resize = function resize() {
        const {mode} = ct.fittoscreen;
        const pixelScaleModifier = ct.highDensity ? (window.devicePixelRatio || 1) : 1;
        const kw = window.innerWidth / ct.roomWidth,
              kh = window.innerHeight / ct.roomHeight;
        let k = Math.min(kw, kh);
        if (mode === 'fastScaleInteger') {
            k = k < 1 ? k : Math.floor(k);
        }
        var canvasWidth, canvasHeight,
            cameraWidth, cameraHeight;
        if (mode === 'expandViewport' || mode === 'expand') {
            canvasWidth = Math.ceil(window.innerWidth * pixelScaleModifier);
            canvasHeight = Math.ceil(window.innerHeight * pixelScaleModifier);
            cameraWidth = window.innerWidth;
            cameraHeight = window.innerHeight;
        } else if (mode === 'fastScale' || mode === 'fastScaleInteger') {
            canvasWidth = Math.ceil(ct.roomWidth * pixelScaleModifier);
            canvasHeight = Math.ceil(ct.roomHeight * pixelScaleModifier);
            cameraWidth = ct.roomWidth;
            cameraHeight = ct.roomHeight;
        } else if (mode === 'scaleFit' || mode === 'scaleFill') {
            if (mode === 'scaleFill') {
                canvasWidth = Math.ceil(ct.roomWidth * kw * pixelScaleModifier);
                canvasHeight = Math.ceil(ct.roomHeight * kh * pixelScaleModifier);
                cameraWidth = window.innerWidth / k;
                cameraHeight = window.innerHeight / k;
            } else { // scaleFit
                canvasWidth = Math.ceil(ct.roomWidth * k * pixelScaleModifier);
                canvasHeight = Math.ceil(ct.roomHeight * k * pixelScaleModifier);
                cameraWidth = ct.roomWidth;
                cameraHeight = ct.roomHeight;
            }
        }

        ct.pixiApp.renderer.resize(canvasWidth, canvasHeight);
        if (mode !== 'scaleFill' && mode !== 'scaleFit') {
            ct.pixiApp.stage.scale.x = ct.pixiApp.stage.scale.y = pixelScaleModifier;
        } else {
            ct.pixiApp.stage.scale.x = ct.pixiApp.stage.scale.y = pixelScaleModifier * k;
        }
        canv.style.width = Math.ceil(canvasWidth / pixelScaleModifier) + 'px';
        canv.style.height = Math.ceil(canvasHeight / pixelScaleModifier) + 'px';
        if (ct.camera) {
            ct.camera.width = cameraWidth;
            ct.camera.height = cameraHeight;
        }
        positionCanvas(mode, k);
    };
    var toggleFullscreen = function () {
        try {
            // Are we in Electron?
            const win = require('electron').remote.BrowserWindow.getFocusedWindow();
            win.setFullScreen(!win.isFullScreen());
            return;
        } catch (e) {
            void e; // Continue with web approach
        }
        var canvas = document.fullscreenElement ||
                     document.webkitFullscreenElement ||
                     document.mozFullScreenElement ||
                     document.msFullscreenElement,
            requester = document.getElementById('ct'),
            request = requester.requestFullscreen ||
                      requester.webkitRequestFullscreen ||
                      requester.mozRequestFullScreen ||
                      requester.msRequestFullscreen,
            exit = document.exitFullscreen ||
                   document.webkitExitFullscreen ||
                   document.mozCancelFullScreen ||
                   document.msExitFullscreen;
        if (!canvas) {
            var promise = request.call(requester);
            if (promise) {
                promise
                .catch(function fullscreenError(err) {
                    console.error('[ct.fittoscreen]', err);
                });
            }
        } else if (exit) {
            exit.call(document);
        }
    };
    window.addEventListener('resize', resize);
    ct.fittoscreen = resize;
    ct.fittoscreen.toggleFullscreen = toggleFullscreen;
    var $mode = 'scaleFit';
    Object.defineProperty(ct.fittoscreen, 'mode', {
        configurable: false,
        enumerable: true,
        set(value) {
            $mode = value;
        },
        get() {
            return $mode;
        }
    });
    ct.fittoscreen.mode = $mode;
    ct.fittoscreen.getIsFullscreen = function getIsFullscreen() {
        try {
            // Are we in Electron?
            const win = require('electron').remote.BrowserWindow.getFocusedWindow;
            return win.isFullScreen;
        } catch (e) {
            void e; // Continue with web approach
        }
        return document.fullscreen || document.webkitIsFullScreen || document.mozFullScreen;
    };
})(ct);

/* eslint-disable no-mixed-operators */
/* eslint-disable no-bitwise */
ct.random = function random(x) {
    return Math.random() * x;
};
ct.u.ext(ct.random, {
    dice(...variants) {
        return variants[Math.floor(Math.random() * variants.length)];
    },
    histogram(...histogram) {
        const coeffs = [...histogram];
        let sumCoeffs = 0;
        for (let i = 0; i < coeffs.length; i++) {
            sumCoeffs += coeffs[i];
            if (i > 0) {
                coeffs[i] += coeffs[i - 1];
            }
        }
        const bucketPosition = Math.random() * sumCoeffs;
        var i;
        for (i = 0; i < coeffs.length; i++) {
            if (coeffs[i] > bucketPosition) {
                break;
            }
        }
        return i / coeffs.length + Math.random() / coeffs.length;
    },
    optimistic(exp) {
        return 1 - ct.random.pessimistic(exp);
    },
    pessimistic(exp) {
        exp = exp || 2;
        return Math.random() ** exp;
    },
    range(x1, x2) {
        return x1 + Math.random() * (x2 - x1);
    },
    deg() {
        return Math.random() * 360;
    },
    coord() {
        return [Math.floor(Math.random() * ct.width), Math.floor(Math.random() * ct.height)];
    },
    chance(x, y) {
        if (y) {
            return (Math.random() * y < x);
        }
        return (Math.random() * 100 < x);
    },
    from(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    },
    // Mulberry32, by bryc from https://stackoverflow.com/a/47593316
    createSeededRandomizer(a) {
        return function seededRandomizer() {
            var t = a += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
});
{
    const handle = {};
    handle.currentRootRandomizer = ct.random.createSeededRandomizer(456852);
    ct.random.seeded = function seeded() {
        return handle.currentRootRandomizer();
    };
    ct.random.setSeed = function setSeed(seed) {
        handle.currentRootRandomizer = ct.random.createSeededRandomizer(seed);
    };
    ct.random.setSeed(9323846264);
}
/**
 * @typedef {ITextureOptions}
 * @property {} []
 */

(function resAddon(ct) {
    const loadingScreen = document.querySelector('.ct-aLoadingScreen'),
          loadingBar = loadingScreen.querySelector('.ct-aLoadingBar');
    const dbFactory = window.dragonBones ? dragonBones.PixiFactory.factory : null;
    /**
     * A utility object that manages and stores textures and other entities
     * @namespace
     */
    ct.res = {
        sounds: {},
        textures: {},
        skeletons: {},
        groups: [{"fonts":{"ungrouped":[],"Fonts":["VCR_OSD_MONO"]},"textures":{"ungrouped":["playerTexture","floor","vuile_sodemiet","KEK","spritsheet","RAAHHHH","jumpscare","shopkeeper","shopkeeper-bg","powerups","extraLife","monsterSpeed","playerSpeed","time","ctjs-splash","hdboye-splash","continue","redButton","blueButton","greenButton","greenWall","blueWall","redWall","menuBg","startBtn","littleGuide","gameIcon","GLITCH_SPRITESHEET","easyMode","pan","glados"]},"styles":{"ungrouped":["MainStyle","extra"]},"rooms":{"ungrouped":["Death","Timemart","menu","guide","Ending","glitch","Paused"],"Secrets":["RoomSecret","RoomPant"],"Room 1-10":["Room1","Room2","Room3","Room4","Room5","Room6","Room7","Room8","Room9","Room10"],"Room 11-20":["Room11","Room12","Room13","Room14","Room15","Room16","Room17","Room18","Room19","Room20"],"Room 21-30":["Room25","Room21","Room22","Room23","Room24"]},"templates":{"ungrouped":["player","enemy","vuile_sodemiet","JUMPSCARE","powerups","monsterSpeed","playerSpeed","extraLife","heartIndicator","continue","blueButton","bluewall","redButton","redwall","greenwall","greenButton","startBtn","glitch","easyMode"]},"sounds":{"ungrouped":["jumpscare","rip","shopkeeper","revive","menu_jingle","beep","footsteps","glitch","bzzt","bzzt2"]},"emitterTandems":{"ungrouped":["Tandem_F2tnF8"]}}][0],
        /**
         * Loads and executes a script by its URL
         * @param {string} url The URL of the script file, with its extension.
         * Can be relative or absolute.
         * @returns {Promise<void>}
         * @async
         */
        loadScript(url = ct.u.required('url', 'ct.res.loadScript')) {
            var script = document.createElement('script');
            script.src = url;
            const promise = new Promise((resolve, reject) => {
                script.onload = () => {
                    resolve();
                };
                script.onerror = () => {
                    reject();
                };
            });
            document.getElementsByTagName('head')[0].appendChild(script);
            return promise;
        },
        /**
         * Loads an individual image as a named ct.js texture.
         * @param {string} url The path to the source image.
         * @param {string} name The name of the resulting ct.js texture
         * as it will be used in your code.
         * @param {ITextureOptions} textureOptions Information about texture's axis
         * and collision shape.
         * @returns {Promise<Array<PIXI.Texture>>}
         */
        loadTexture(url = ct.u.required('url', 'ct.res.loadTexture'), name = ct.u.required('name', 'ct.res.loadTexture'), textureOptions = {}) {
            const loader = new PIXI.Loader();
            loader.add(url, url);
            return new Promise((resolve, reject) => {
                loader.load((loader, resources) => {
                    resolve(resources);
                });
                loader.onError.add(() => {
                    reject(new Error(`[ct.res] Could not load image ${url}`));
                });
            })
            .then(resources => {
                const tex = [resources[url].texture];
                tex.shape = tex[0].shape = textureOptions.shape || {};
                tex[0].defaultAnchor = new PIXI.Point(
                    textureOptions.anchor.x || 0,
                    textureOptions.anchor.x || 0
                );
                ct.res.textures[name] = tex;
                return tex;
            });
        },
        /**
         * Loads a skeleton made in DragonBones into the game
         * @param {string} ske Path to the _ske.json file that contains
         * the armature and animations.
         * @param {string} tex Path to the _tex.json file that describes the atlas
         * with a skeleton's textures.
         * @param {string} png Path to the _tex.png atlas that contains
         * all the textures of the skeleton.
         * @param {string} name The name of the skeleton as it will be used in ct.js game
         */
        loadDragonBonesSkeleton(ske, tex, png, name = ct.u.required('name', 'ct.res.loadDragonBonesSkeleton')) {
            const dbf = dragonBones.PixiFactory.factory;
            const loader = new PIXI.Loader();
            loader
                .add(ske, ske)
                .add(tex, tex)
                .add(png, png);
            return new Promise((resolve, reject) => {
                loader.load(() => {
                    resolve();
                });
                loader.onError.add(() => {
                    reject(new Error(`[ct.res] Could not load skeleton with _ske.json: ${ske}, _tex.json: ${tex}, _tex.png: ${png}.`));
                });
            }).then(() => {
                dbf.parseDragonBonesData(loader.resources[ske].data);
                dbf.parseTextureAtlasData(
                    loader.resources[tex].data,
                    loader.resources[png].texture
                );
                // eslint-disable-next-line id-blacklist
                ct.res.skeletons[name] = loader.resources[ske].data;
            });
        },
        /**
         * Loads a Texture Packer compatible .json file with its source image,
         * adding ct.js textures to the game.
         * @param {string} url The path to the JSON file that describes the atlas' textures.
         * @returns {Promise<Array<string>>} A promise that resolves into an array
         * of all the loaded textures.
         */
        loadAtlas(url = ct.u.required('url', 'ct.res.loadAtlas')) {
            const loader = new PIXI.Loader();
            loader.add(url, url);
            return new Promise((resolve, reject) => {
                loader.load((loader, resources) => {
                    resolve(resources);
                });
                loader.onError.add(() => {
                    reject(new Error(`[ct.res] Could not load atlas ${url}`));
                });
            })
            .then(resources => {
                const sheet = resources[url].spritesheet;
                for (const animation in sheet.animations) {
                    const tex = sheet.animations[animation];
                    const animData = sheet.data.animations;
                    for (let i = 0, l = animData[animation].length; i < l; i++) {
                        const a = animData[animation],
                              f = a[i];
                        tex[i].shape = sheet.data.frames[f].shape;
                    }
                    tex.shape = tex[0].shape || {};
                    ct.res.textures[animation] = tex;
                }
                return Object.keys(sheet.animations);
            });
        },
        /**
         * Loads a bitmap font by its XML file.
         * @param {string} url The path to the XML file that describes the bitmap fonts.
         * @param {string} name The name of the font.
         * @returns {Promise<string>} A promise that resolves into the font's name
         * (the one you've passed with `name`).
         */
        loadBitmapFont(url = ct.u.required('url', 'ct.res.loadBitmapFont'), name = ct.u.required('name', 'ct.res.loadBitmapFont')) {
            const loader = new PIXI.Loader();
            loader.add(name, url);
            return new Promise((resolve, reject) => {
                loader.load((loader, resources) => {
                    resolve(resources);
                });
                loader.onError.add(() => {
                    reject(new Error(`[ct.res] Could not load bitmap font ${url}`));
                });
            });
        },
        loadGame() {
            // !! This method is intended to be filled by ct.IDE and be executed
            // exactly once at game startup. Don't put your code here.
            const changeProgress = percents => {
                loadingScreen.setAttribute('data-progress', percents);
                loadingBar.style.width = percents + '%';
            };

            const atlases = [["./img/a0.json","./img/a1.json","./img/a2.json","./img/a3.json"]][0];
            const tiledImages = [{"floor":{"source":"./img/t0.png","shape":{"type":"rect","top":155,"bottom":155,"left":160,"right":160},"anchor":{"x":0.5,"y":0.5}},"shopkeeper-bg":{"source":"./img/t1.png","shape":{"type":"rect","top":0,"bottom":720,"left":0,"right":1280},"anchor":{"x":0,"y":0}}}][0];
            const sounds = [[{"name":"jumpscare","wav":"./snd/QJnBqFPpchm82g.wav","mp3":false,"ogg":false,"poolSize":5,"isMusic":false},{"name":"rip","wav":"./snd/phn4tG3HRj5T6r.wav","mp3":false,"ogg":false,"poolSize":5,"isMusic":true},{"name":"shopkeeper","wav":"./snd/tmd96gM1kFM4Qr.wav","mp3":false,"ogg":false,"poolSize":5,"isMusic":true},{"name":"revive","wav":"./snd/nzrNgHhPDqL53t.wav","mp3":false,"ogg":false,"poolSize":5,"isMusic":false},{"name":"menu_jingle","wav":"./snd/WzW6dR4Nw8P6Bh.wav","mp3":false,"ogg":false,"poolSize":5,"isMusic":true},{"name":"beep","wav":"./snd/mPd7tF8r3Wzz2W.wav","mp3":false,"ogg":false,"poolSize":5,"isMusic":false},{"name":"footsteps","wav":false,"mp3":"./snd/2QBJTnWfKB5hQr.mp3","ogg":false,"poolSize":5,"isMusic":false},{"name":"glitch","wav":"./snd/6tzwGDtDMMKK5q.wav","mp3":false,"ogg":false,"poolSize":5,"isMusic":false},{"name":"bzzt","wav":"./snd/F6Q945g9qDd3kQ.wav","mp3":false,"ogg":false,"poolSize":5,"isMusic":false},{"name":"bzzt2","wav":"./snd/rcPBPNMwQnrd15.wav","mp3":false,"ogg":false,"poolSize":5,"isMusic":false}]][0];
            const bitmapFonts = [{}][0];
            const dbSkeletons = [[]][0]; // DB means DragonBones

            if (sounds.length && !ct.sound) {
                throw new Error('[ct.res] No sound system found. Make sure you enable one of the `sound` catmods. If you don\'t need sounds, remove them from your ct.js project.');
            }

            const totalAssets = atlases.length;
            let assetsLoaded = 0;
            const loadingPromises = [];

            loadingPromises.push(...atlases.map(atlas =>
                ct.res.loadAtlas(atlas)
                .then(texturesNames => {
                    assetsLoaded++;
                    changeProgress(assetsLoaded / totalAssets * 100);
                    return texturesNames;
                })));

            for (const name in tiledImages) {
                loadingPromises.push(ct.res.loadTexture(
                    tiledImages[name].source,
                    name,
                    {
                        anchor: tiledImages[name].anchor,
                        shape: tiledImages[name].shape
                    }
                ));
            }
            for (const font in bitmapFonts) {
                loadingPromises.push(ct.res.loadBitmapFont(bitmapFonts[font], font));
            }
            for (const skel of dbSkeletons) {
                loadingPromises.push(ct.res.loadDragonBonesSkeleton(...skel));
            }

            for (const sound of sounds) {
                ct.sound.init(sound.name, {
                    wav: sound.wav || false,
                    mp3: sound.mp3 || false,
                    ogg: sound.ogg || false
                }, {
                    poolSize: sound.poolSize,
                    music: sound.isMusic
                });
            }

            /*@res@*/
            

            Promise.all(loadingPromises)
            .then(() => {
                Object.defineProperty(ct.templates.Copy.prototype, 'cgroup', {
    set: function (value) {
        this.$cgroup = value;
    },
    get: function () {
        return this.$cgroup;
    }
});
Object.defineProperty(ct.templates.Copy.prototype, 'moveContinuous', {
    value: function (cgroup, precision) {
        if (this.gravity) {
            this.hspeed += this.gravity * ct.delta * Math.cos(this.gravityDir * Math.PI / 180);
            this.vspeed += this.gravity * ct.delta * Math.sin(this.gravityDir * Math.PI / 180);
        }
        return ct.place.moveAlong(this, this.direction, this.speed * ct.delta, cgroup, precision);
    }
});
Object.defineProperty(ct.templates.Copy.prototype, 'moveBullet', {
    value: function (cgroup, precision) {
        return this.moveContinuous(cgroup, precision);
    }
});

Object.defineProperty(ct.templates.Copy.prototype, 'moveContinuousByAxes', {
    value: function (cgroup, precision) {
        if (this.gravity) {
            this.hspeed += this.gravity * ct.delta * Math.cos(this.gravityDir * Math.PI / 180);
            this.vspeed += this.gravity * ct.delta * Math.sin(this.gravityDir * Math.PI / 180);
        }
        return ct.place.moveByAxes(
            this,
            this.hspeed * ct.delta,
            this.vspeed * ct.delta,
            cgroup,
            precision
        );
    }
});
Object.defineProperty(ct.templates.Copy.prototype, 'moveSmart', {
    value: function (cgroup, precision) {
        return this.moveContinuousByAxes(cgroup, precision);
    }
});

Object.defineProperty(ct.templates.Tilemap.prototype, 'enableCollisions', {
    value: function (cgroup) {
        ct.place.enableTilemapCollisions(this, cgroup);
    }
});
(function ctSplashscreen() {
    ct.splashscreen = {
        slides: [[{"texture":"hdboye-splash","effect":"none","fill":false},{"texture":"ctjs-splash","effect":"none"}]][0]
    };
    const {slides} = ct.splashscreen,
          [slideDuration] = [1000],
          [transitionDuration] = [750],
          backgroundColor = '#000000',
          transitionColor = ct.u.hexToPixi('#000000'),
          [skippable] = [true];

    const oldStartingName = ct.rooms.starting;
    const oldRoom = ct.rooms.templates[oldStartingName];

    let currentIndex = 0,
        currentLogo = null;

    const advance = function advance() {
        currentLogo = null;
        currentIndex++;
        if (currentIndex === slides.length) {
            ct.rooms.starting = oldStartingName;
            ct.rooms.switch(oldStartingName);
            return;
        }
        ct.rooms.switch('CTSPLASHSCREEN');
    };
    const createSlide = function createSlide() {
        const ind = currentIndex;
        const slide = slides[ind];
        currentLogo = new PIXI.Sprite(ct.res.getTexture(slide.texture, 0));
        currentLogo.x = ct.camera.width / 2;
        currentLogo.y = ct.camera.height / 2;
        currentLogo.anchor.x = currentLogo.anchor.y = 0.5;
        currentLogo.scale.x = currentLogo.scale.y =
            Math.min(ct.camera.width / currentLogo.width, ct.camera.height / currentLogo.height);
        if (!slide.fill) {
            currentLogo.scale.x *= 0.5;
            currentLogo.scale.y *= 0.5;
        }
        if (slide.effect === 'zoomIn') {
            const targetScale = currentLogo.scale.x;
            currentLogo.scale.x = currentLogo.scale.y = targetScale * 0.9;
            ct.tween.add({
                obj: currentLogo.scale,
                fields: {
                    x: targetScale,
                    y: targetScale
                },
                duration: slideDuration,
                silent: true
            });
        } else if (slide.effect === 'zoomOut') {
            ct.tween.add({
                obj: currentLogo.scale,
                fields: {
                    x: currentLogo.scale.x * 0.9,
                    y: currentLogo.scale.x * 0.9
                },
                duration: slideDuration,
                silent: true
            });
        }
        ct.room.addChild(currentLogo);
        ct.transition.fadeIn(transitionDuration, transitionColor);
        ct.u.wait(slideDuration - transitionDuration)
        .then(() => ct.transition.fadeOut(transitionDuration, transitionColor))
        .then(() => {
            advance();
        })
        .catch(() => void 0);
    };

    ct.inputs.addAction('CTSPLASHSCREENAnyInput', [{
        code: 'gamepad.Any',
        multiplier: 1
    }, {
        code: 'mouse.Left',
        multiplier: 1
    }, {
        code: 'touch.Any',
        multiplier: 1
    }, {
        code: 'keyboard.Escape',
        multiplier: 1
    }, {
        code: 'keyboard.Space',
        multiplier: 1
    }]);

    ct.rooms.templates.CTSPLASHSCREEN = {
        name: 'CTSPLASHSCREEN',
        backgroundColor: backgroundColor,
        width: oldRoom.width,
        height: oldRoom.height,
        objects: [],
        bgs: [],
        tiles: [],
        onCreate: function onCreate() {
            createSlide();
        },
        onDraw: function onDraw() {
            void 0;
        },
        onLeave: function onLeave() {
            void 0;
        },
        onStep: function onStep() {
            if (skippable && ct.actions.CTSPLASHSCREENAnyInput.pressed) {
                advance();
            }
        }
    };

    ct.rooms.starting = 'CTSPLASHSCREEN';
})();
ct.pointer.setupListeners();

                loadingScreen.classList.add('hidden');
                ct.pixiApp.ticker.add(ct.loop);
                ct.rooms.forceSwitch(ct.rooms.starting);
            })
            .catch(console.error);
        },
        /*
         * Gets a pixi.js texture from a ct.js' texture name,
         * so that it can be used in pixi.js objects.
         * @param {string|-1} name The name of the ct.js texture, or -1 for an empty texture
         * @param {number} [frame] The frame to extract
         * @returns {PIXI.Texture|Array<PIXI.Texture>} If `frame` was specified,
         * returns a single PIXI.Texture. Otherwise, returns an array
         * with all the frames of this ct.js' texture.
         *
         * @note Formatted as a non-jsdoc comment as it requires a better ts declaration
         * than the auto-generated one
         */
        getTexture(name, frame) {
            if (frame === null) {
                frame = void 0;
            }
            if (name === -1) {
                if (frame !== void 0) {
                    return PIXI.Texture.EMPTY;
                }
                return [PIXI.Texture.EMPTY];
            }
            if (!(name in ct.res.textures)) {
                throw new Error(`Attempt to get a non-existent texture ${name}`);
            }
            const tex = ct.res.textures[name];
            if (frame !== void 0) {
                return tex[frame];
            }
            return tex;
        },
        /*
         * Returns the collision shape of the given texture.
         * @param {string|-1} name The name of the ct.js texture, or -1 for an empty collision shape
         * @returns {object}
         *
         * @note Formatted as a non-jsdoc comment as it requires a better ts declaration
         * than the auto-generated one
         */
        getTextureShape(name) {
            if (name === -1) {
                return {};
            }
            if (!(name in ct.res.textures)) {
                throw new Error(`Attempt to get a shape of a non-existent texture ${name}`);
            }
            return ct.res.textures[name].shape;
        },
        /**
         * Creates a DragonBones skeleton, ready to be added to your copies.
         * @param {string} name The name of the skeleton asset
         * @param {string} [skin] Optional; allows you to specify the used skin
         * @returns {object} The created skeleton
         */
        makeSkeleton(name, skin) {
            const r = ct.res.skeletons[name],
                  skel = dbFactory.buildArmatureDisplay('Armature', r.name, skin);
            skel.ctName = name;
            skel.on(dragonBones.EventObject.SOUND_EVENT, function skeletonSound(event) {
                if (ct.sound.exists(event.name)) {
                    ct.sound.spawn(event.name);
                } else {
                    // eslint-disable-next-line no-console
                    console.warn(`Skeleton ${skel.ctName} tries to play a non-existing sound ${event.name} at animation ${skel.animation.lastAnimationName}`);
                }
            });
            return skel;
        }
    };

    ct.res.loadGame();
})(ct);

/**
 * A collection of content that was made inside ct.IDE.
 * @type {any}
 */
ct.content = JSON.parse(["{}"][0] || '{}');

var monsterSpeedMultiplier = 1.0
var playerSpeedMultiplier = 1.0
var extraLife = false
var time = 30
var sessionTimer = 0
var inRoom = 0

var redPressed = false
var bluePressed = false
var greenPressed = false

var campyEnabled = false
var glitchRoom
var easyMode = false

/*var dclient = makeClient("1055588590169641022")
dclient.updatePresence({
  state: 'Stop snooping.?',
  details: 'Stop snooping.',
  instance: true,
});*/;
