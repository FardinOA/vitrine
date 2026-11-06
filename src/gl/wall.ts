import * as THREE from "three";

/**
 * The hero wall and the back of the headline are one flat plane. It carries the type, opens
 * a round hole behind the glass, casts the door's soft shadow, and bends the type under the
 * hand like a lens sliding across it.
 */
export function wallMaterial(field: string, ink: string) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: null as THREE.Texture | null },
      uField: { value: new THREE.Color(field) },
      uInk: { value: new THREE.Color(ink) },
      uRect: { value: new THREE.Vector2(10, 6) },
      uCenter: { value: new THREE.Vector2(0, 0) },
      uHole: { value: 1.08 },
      uShadowR: { value: 1.21 },
      uWipe: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uLens: { value: 0 },
      uLensR: { value: 0.62 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vP = w.xy;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform sampler2D uMap;
      uniform vec3 uField, uInk;
      uniform vec2 uRect, uPointer, uCenter;
      uniform float uHole, uShadowR, uWipe, uLens, uLensR;
      varying vec2 vP;

      void main() {
        float r = length(vP);
        if (r < uHole * uWipe) discard;

        // Under the hand the type swells and bends, as if a lens were resting on it.
        vec2 d = vP - uPointer;
        float dl = length(d);
        float f = 1.0 - smoothstep(0.0, uLensR, dl);
        vec2 p = vP - d * f * f * 0.52 * uLens;

        vec2 uv = (p - uCenter) / uRect + 0.5;
        float a = 0.0;
        if (uv.x > 0.0 && uv.x < 1.0 && uv.y > 0.0 && uv.y < 1.0) a = texture2D(uMap, uv).a;

        // A soft contact shadow under the door.
        vec2 q = vP - vec2(0.05, -0.11);
        float sd = length(q) - uShadowR;
        float shadow = (1.0 - smoothstep(-0.04, 0.34, sd)) * 0.3;
        vec3 ground = mix(uField, uField * vec3(0.5, 0.62, 0.58), shadow * step(uHole, r));

        // Lens rim: a fine bright edge so the hand can be seen on the plain wall too.
        float rim = (1.0 - smoothstep(0.0, 0.018, abs(dl - uLensR * 0.92))) * uLens * 0.2;
        float inner = (1.0 - smoothstep(0.0, uLensR, dl)) * uLens * 0.09;
        ground = mix(ground, vec3(1.0), rim + inner);

        gl_FragColor = vec4(mix(ground, uInk, a), 1.0);
        #include <colorspace_fragment>
      }
    `,
  });
}
