// VS Code Neovide-like cursor, designed for Custom CSS and JS Loader.
(function () {
    const CONFIG = {
        opacity: 0.88,
        holdMs: 170,
        fadeMs: 180,
        zIndex: 9999,
        minWidth: 2,
        maxDrawWidth: 4,
        scanIntervalMs: 100,

        animationLength: 0.16,
        shortAnimationLength: 0.065,
        shortMoveThreshold: 14,

        rankTrailFactors: [1.05, 0.82, 0.36, 0.08],
        useHardSnap: true,
        leadingSnapFactor: 0.045,
        leadingSnapThreshold: 0.45,
        resetThreshold: 0.08,
        maxStretchFactor: 56,

        useShadow: false,
        shadowBlurFactor: 0.45,
        fallbackColor: "#ca9ee6"
    };

    const GLOBAL_KEY = "__vscodeNeovideCursorLite";

    if (window[GLOBAL_KEY] && window[GLOBAL_KEY].dispose) {
        window[GLOBAL_KEY].dispose();
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function normalize(vector) {
        const length = Math.hypot(vector.x, vector.y);
        return length ? { x: vector.x / length, y: vector.y / length } : { x: 0, y: 0 };
    }

    function isUsableColor(value) {
        if (!value) return false;
        const color = value.trim();
        if (!color || color === "transparent") return false;
        if (/rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/i.test(color)) return false;
        if (/rgba?\([^)]*,\s*0\s*\)$/i.test(color)) return false;
        return true;
    }

    function getThemeCursorColor() {
        const rootColor = getComputedStyle(document.documentElement)
            .getPropertyValue("--vscode-editorCursor-foreground")
            .trim();

        if (isUsableColor(rootColor)) return rootColor;
        return CONFIG.fallbackColor;
    }

    function getCursorColor(cursor) {
        const style = getComputedStyle(cursor);
        const candidates = [
            style.backgroundColor,
            style.borderLeftColor,
            style.borderColor,
            style.color,
            getThemeCursorColor()
        ];

        return candidates.find(isUsableColor) || CONFIG.fallbackColor;
    }

    const CORNER_POINTS = [
        { x: -0.5, y: -0.5 },
        { x: 0.5, y: -0.5 },
        { x: 0.5, y: 0.5 },
        { x: -0.5, y: 0.5 }
    ];

    class DampedSpring {
        constructor(animationLength) {
            this.position = 0;
            this.velocity = 0;
            this.animationLength = animationLength;
        }

        update(dt) {
            if (this.animationLength <= dt || Math.abs(this.position) < 0.001) {
                this.reset();
                return false;
            }

            const omega = 4 / this.animationLength;
            const start = this.position;
            const helper = this.position * omega + this.velocity;
            const decay = Math.exp(-omega * dt);

            this.position = (start + helper * dt) * decay;
            this.velocity = decay * (-start * omega - helper * dt * omega + helper);

            return Math.abs(this.position) >= 0.01;
        }

        reset() {
            this.position = 0;
            this.velocity = 0;
        }
    }

    class Corner {
        constructor(relativePoint) {
            this.relativePoint = relativePoint;
            this.current = { x: 0, y: 0 };
            this.previousDest = { x: -100000, y: -100000 };
            this.springX = new DampedSpring(CONFIG.animationLength);
            this.springY = new DampedSpring(CONFIG.animationLength);
        }

        getDest(center, dimensions) {
            return {
                x: center.x + this.relativePoint.x * dimensions.width,
                y: center.y + this.relativePoint.y * dimensions.height
            };
        }

        setAt(center, dimensions) {
            const dest = this.getDest(center, dimensions);
            this.current = { ...dest };
            this.previousDest = { ...dest };
            this.springX.reset();
            this.springY.reset();
        }

        getAlignment(center, dimensions) {
            const dest = this.getDest(center, dimensions);
            const travel = normalize({
                x: dest.x - this.current.x,
                y: dest.y - this.current.y
            });
            const cornerDirection = normalize(this.relativePoint);
            return travel.x * cornerDirection.x + travel.y * cornerDirection.y;
        }

        jump(center, dimensions, movement, rank) {
            const normalizedMovement = normalize(movement);
            const normalizedCorner = normalize(this.relativePoint);
            const leadingAlignment =
                normalizedMovement.x * normalizedCorner.x +
                normalizedMovement.y * normalizedCorner.y;

            const moveInCells = {
                x: Math.abs(movement.x) / Math.max(dimensions.width, 1),
                y: Math.abs(movement.y) / Math.max(dimensions.height, 1)
            };
            const isShortMove =
                moveInCells.x <= CONFIG.shortMoveThreshold &&
                moveInCells.y <= 0.2;
            const baseLength = isShortMove
                ? CONFIG.shortAnimationLength
                : CONFIG.animationLength;

            let factor = CONFIG.rankTrailFactors[rank] || 1;
            if (CONFIG.useHardSnap && leadingAlignment > CONFIG.leadingSnapThreshold) {
                factor = CONFIG.leadingSnapFactor;
            }

            const length = clamp(baseLength * factor, 0.016, 1.2);
            this.springX.animationLength = length;
            this.springY.animationLength = length;

            if (length > CONFIG.resetThreshold) {
                this.springX.velocity = 0;
                this.springY.velocity = 0;
            }
        }

        update(center, dimensions, dt, immediate) {
            const dest = this.getDest(center, dimensions);

            if (dest.x !== this.previousDest.x || dest.y !== this.previousDest.y) {
                this.springX.position = dest.x - this.current.x;
                this.springY.position = dest.y - this.current.y;
                this.previousDest = { ...dest };
            }

            if (immediate) {
                this.setAt(center, dimensions);
                return false;
            }

            this.springX.update(dt);
            this.springY.update(dt);

            const maxStretch =
                Math.max(dimensions.width, dimensions.height) * CONFIG.maxStretchFactor;
            this.springX.position = clamp(this.springX.position, -maxStretch, maxStretch);
            this.springY.position = clamp(this.springY.position, -maxStretch, maxStretch);

            this.current.x = dest.x - this.springX.position;
            this.current.y = dest.y - this.springY.position;

            return Math.abs(this.springX.position) > 0.35 || Math.abs(this.springY.position) > 0.35;
        }
    }

    function createAnimatedCursor() {
        const corners = CORNER_POINTS.map((point) => new Corner(point));
        let dimensions = { width: 8, height: 18 };
        let center = { x: 0, y: 0 };
        let previousCenter = null;
        let color = CONFIG.fallbackColor;
        let initialized = false;
        let jumped = false;
        let lastTime = performance.now();

        return {
            move(rect, sourceCenter) {
                const nextDimensions = {
                    width: clamp(
                        Math.max(rect.width, CONFIG.minWidth),
                        CONFIG.minWidth,
                        CONFIG.maxDrawWidth
                    ),
                    height: rect.height
                };
                const nextCenter = {
                    x: rect.left + nextDimensions.width / 2,
                    y: rect.top + nextDimensions.height / 2
                };
                const startCenter = initialized ? center : sourceCenter || nextCenter;

                dimensions = nextDimensions;
                color = rect.color || color;

                if (!initialized) {
                    corners.forEach((corner) => corner.setAt(startCenter, dimensions));
                    initialized = true;
                }

                previousCenter = startCenter;
                center = nextCenter;
                jumped = true;
            },

            draw(context, immediate) {
                if (!initialized) return false;

                const now = performance.now();
                const dt = Math.min((now - lastTime) / 1000, 1 / 30);
                lastTime = now;

                if (jumped) {
                    const movement = previousCenter
                        ? { x: center.x - previousCenter.x, y: center.y - previousCenter.y }
                        : { x: 0, y: 0 };

                    const ranks = corners
                        .map((corner, index) => ({
                            index,
                            value: corner.getAlignment(center, dimensions)
                        }))
                        .sort((a, b) => a.value - b.value)
                        .reduce((result, item, rank) => {
                            result[item.index] = rank;
                            return result;
                        }, []);

                    corners.forEach((corner, index) => {
                        corner.jump(center, dimensions, movement, ranks[index]);
                    });

                    jumped = false;
                }

                let animating = false;
                corners.forEach((corner) => {
                    if (corner.update(center, dimensions, dt, immediate)) {
                        animating = true;
                    }
                });

                context.save();
                context.globalAlpha = CONFIG.opacity;
                context.fillStyle = color;

                if (CONFIG.useShadow) {
                    context.shadowColor = color;
                    context.shadowBlur =
                        CONFIG.shadowBlurFactor * Math.max(dimensions.width, dimensions.height);
                }

                context.beginPath();
                context.moveTo(corners[0].current.x, corners[0].current.y);
                for (let index = 1; index < corners.length; index += 1) {
                    context.lineTo(corners[index].current.x, corners[index].current.y);
                }
                context.closePath();
                context.fill();
                context.restore();

                return animating;
            }
        };
    }

    class CursorManager {
        constructor() {
            this.cursors = new Map();
            this.lastGlobalCenter = null;
            this.isScrolling = false;
            this.lastAnimationAt = 0;
            this.fadeTimer = 0;
            this.fadePending = false;
            this.canvasVisible = false;
            this.animationFrame = 0;
            this.scanTimer = 0;
            this.devicePixelRatio = 1;

            this.style = document.createElement("style");
            this.canvas = document.createElement("canvas");
            this.context = this.canvas.getContext("2d");

            this.onResize = this.resize.bind(this);
            this.onScroll = this.markScrolling.bind(this);
            this.loop = this.loop.bind(this);
        }

        start() {
            this.style.textContent = `
                .monaco-editor .cursors-layer .cursor {
                    transition: none !important;
                }
            `;
            document.head.appendChild(this.style);

            this.canvas.style.cssText = `
                position: fixed;
                inset: 0;
                pointer-events: none;
                z-index: ${CONFIG.zIndex};
                opacity: 0;
                transition: opacity ${CONFIG.fadeMs}ms ease-out;
            `;
            document.body.appendChild(this.canvas);

            this.resize();
            window.addEventListener("resize", this.onResize);
            document.addEventListener("scroll", this.onScroll, {
                capture: true,
                passive: true
            });

            this.scan();
            this.scanTimer = window.setInterval(() => this.scan(), CONFIG.scanIntervalMs);
            this.animationFrame = requestAnimationFrame(this.loop);
        }

        resize() {
            this.devicePixelRatio = window.devicePixelRatio || 1;
            this.canvas.width = Math.ceil(window.innerWidth * this.devicePixelRatio);
            this.canvas.height = Math.ceil(window.innerHeight * this.devicePixelRatio);
            this.canvas.style.width = `${window.innerWidth}px`;
            this.canvas.style.height = `${window.innerHeight}px`;
            this.context.setTransform(
                this.devicePixelRatio,
                0,
                0,
                this.devicePixelRatio,
                0,
                0
            );
        }

        markScrolling() {
            this.isScrolling = true;
            clearTimeout(this.scrollTimer);
            this.scrollTimer = setTimeout(() => {
                this.isScrolling = false;
            }, 100);
        }

        getCursorRect(cursor) {
            const rect = cursor.getBoundingClientRect();
            if (rect.width <= 0 || rect.height <= 0) return null;

            return {
                left: rect.left,
                top: rect.top,
                width: Math.max(rect.width, CONFIG.minWidth),
                height: rect.height,
                color: getCursorColor(cursor)
            };
        }

        isCursorVisible(cursor) {
            const style = getComputedStyle(cursor);
            const rect = cursor.getBoundingClientRect();

            return (
                cursor.isConnected &&
                style.display !== "none" &&
                style.visibility !== "hidden" &&
                !style.transform.includes("-10000px") &&
                rect.left > -100 &&
                rect.top > -100 &&
                rect.left < window.innerWidth + 100 &&
                rect.top < window.innerHeight + 100
            );
        }

        scan() {
            const liveElements = new Set();
            const elements = document.querySelectorAll(".monaco-editor .cursors-layer .cursor");

            elements.forEach((cursor) => {
                liveElements.add(cursor);

                if (!this.cursors.has(cursor)) {
                    const rect = this.getCursorRect(cursor);
                    if (!rect) return;

                    const instance = createAnimatedCursor();
                    instance.move(rect, this.lastGlobalCenter);

                    this.cursors.set(cursor, {
                        instance,
                        lastRect: rect,
                        active: false
                    });
                }
            });

            this.cursors.forEach((_, cursor) => {
                if (!liveElements.has(cursor) || !cursor.isConnected) {
                    cursor.style.opacity = "";
                    cursor.style.transition = "";
                    this.cursors.delete(cursor);
                }
            });
        }

        setCanvasVisible(visible) {
            if (visible) {
                clearTimeout(this.fadeTimer);
                this.fadePending = false;
                this.canvasVisible = true;
                this.canvas.style.transition = "none";
                this.canvas.style.opacity = "1";
                return;
            }

            if (!this.canvasVisible || this.fadePending) return;

            this.fadePending = true;
            this.fadeTimer = setTimeout(() => {
                this.canvas.style.transition = `opacity ${CONFIG.fadeMs}ms ease-out`;
                this.canvas.style.opacity = "0";
                this.canvasVisible = false;
                this.fadePending = false;
            }, CONFIG.holdMs);
        }

        loop() {
            this.context.setTransform(
                this.devicePixelRatio,
                0,
                0,
                this.devicePixelRatio,
                0,
                0
            );
            this.context.clearRect(0, 0, window.innerWidth, window.innerHeight);

            let anyAnimating = false;

            this.cursors.forEach((data, cursor) => {
                if (!cursor.isConnected) {
                    this.cursors.delete(cursor);
                    return;
                }

                const rect = this.getCursorRect(cursor);
                const visible = rect && this.isCursorVisible(cursor);

                if (!visible) {
                    data.active = false;
                    return;
                }

                const moved =
                    !data.lastRect ||
                    Math.round(rect.left) !== Math.round(data.lastRect.left) ||
                    Math.round(rect.top) !== Math.round(data.lastRect.top) ||
                    Math.round(rect.width) !== Math.round(data.lastRect.width) ||
                    Math.round(rect.height) !== Math.round(data.lastRect.height);

                if (visible && !data.active) {
                    data.instance.move(rect, this.lastGlobalCenter);
                    data.active = true;
                } else if (moved) {
                    data.instance.move(rect);
                }

                data.lastRect = rect;

                const center = {
                    x: rect.left + rect.width / 2,
                    y: rect.top + rect.height / 2
                };
                this.lastGlobalCenter = center;

                if (data.instance.draw(this.context, this.isScrolling)) {
                    anyAnimating = true;
                }
            });

            if (anyAnimating) {
                this.lastAnimationAt = performance.now();
                this.setCanvasVisible(true);
                this.cursors.forEach((data, cursor) => {
                    if (data.active) {
                        cursor.style.transition = "opacity 0s linear";
                        cursor.style.opacity = "0";
                    }
                });
            } else {
                const recentlyAnimated =
                    performance.now() - this.lastAnimationAt <= CONFIG.holdMs + CONFIG.fadeMs;

                if (recentlyAnimated) {
                    this.setCanvasVisible(false);
                }

                this.cursors.forEach((data, cursor) => {
                    if (data.active) {
                        cursor.style.transition = "";
                        cursor.style.opacity = "";
                    }
                });
            }

            this.animationFrame = requestAnimationFrame(this.loop);
        }

        dispose() {
            cancelAnimationFrame(this.animationFrame);
            clearInterval(this.scanTimer);
            clearTimeout(this.scrollTimer);
            clearTimeout(this.fadeTimer);
            window.removeEventListener("resize", this.onResize);
            document.removeEventListener("scroll", this.onScroll, { capture: true });

            this.cursors.forEach((_, cursor) => {
                cursor.style.opacity = "";
                cursor.style.transition = "";
            });

            this.cursors.clear();
            this.canvas.remove();
            this.style.remove();
        }
    }

    let manager = null;
    let startTimer = 0;

    function startWhenReady() {
        if (!document.head || !document.body) {
            startTimer = window.setTimeout(startWhenReady, 100);
            return;
        }

        manager = new CursorManager();
        manager.start();

        window[GLOBAL_KEY] = {
            dispose() {
                clearTimeout(startTimer);
                if (manager) {
                    manager.dispose();
                    manager = null;
                }
                delete window[GLOBAL_KEY];
            }
        };
    }

    startWhenReady();
})();
