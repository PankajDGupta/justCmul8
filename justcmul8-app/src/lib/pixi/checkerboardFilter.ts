import * as PIXI from "pixi.js";

const fragmentShader = `
varying vec2 vTextureCoord;
uniform sampler2D uSampler;

void main(void) {
    vec4 color = texture2D(uSampler, vTextureCoord);
    
    float maxVal = max(color.r, max(color.g, color.b));
    float minVal = min(color.r, min(color.g, color.b));
    float saturation = maxVal - minVal;
    
    // Any pixel with very low saturation (grey, white, or black) gets keyed out.
    // Neon colours have high saturation (e.g., cyan is r=0, g=1, b=1 -> sat=1.0)
    // The DALL-E checkerboard is entirely composed of greyscale pixels.
    if (saturation < 0.25 || maxVal < 0.1) {
        gl_FragColor = vec4(0.0);
    } else {
        gl_FragColor = color;
    }
}
`;

export class CheckerboardFilter extends PIXI.Filter {
  constructor() {
    super(undefined, fragmentShader);
  }
}

export const checkerboardFilter = new CheckerboardFilter();
