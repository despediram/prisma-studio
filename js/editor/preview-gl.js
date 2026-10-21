/* Prisma Studio — prévia opcional de Luz/Cor em WebGL 1.
 * Trabalha no proxy de até 1600 px; a exportação e Aplicar continuam no worker.
 * Temperatura, exposição linear, contraste, saturação e curvas seguem a ordem
 * do motor. Curvas usam as mesmas LUTs monotônicas, em textura float/NEAREST.
 * Parâmetros não suportados, falha ou perda de contexto retornam null em silêncio.
 */
(function () {
  'use strict';

  const PS = window.PS,
    IP = window.PrismaImgProc;
  const supported = new Set(['temperature', 'exposure', 'contrast', 'saturation', 'curves']);
  const neutral = IP.neutralParams();
  let gl = null,
    program = null,
    sourceTexture = null,
    lutTexture = null,
    output = null;
  let disabled = false,
    uploadedSource = null,
    uploadedVersion = -1,
    lastCurves = '',
    uniforms = {},
    curvesOn = false;
  const api = PS.gpuPreview = {
    enabled: true,
    available: false
  };
  const vertex = `attribute vec2 aPosition; varying vec2 uv;
    void main(){uv=(aPosition+1.0)*0.5;gl_Position=vec4(aPosition,0.0,1.0);}`;
  const fragment = `precision highp float;
    varying vec2 uv;uniform sampler2D image;uniform sampler2D lut;
    uniform float exposure;uniform float temperature;uniform float contrast;
    uniform float saturation;uniform bool curves;
    float linearize(float v){return v<=0.04045?v/12.92:pow((v+0.055)/1.055,2.4);}
    float srgb(float v){return v<=0.0031308?v*12.92:1.055*pow(v,1.0/2.4)-0.055;}
    float expose(float v){return srgb(min(1.0,linearize(clamp(v,0.0,2.0))*exp2(exposure)));}
    float tone(float v){v=clamp(v,0.0,1.0);if(contrast>0.0){float s=v<0.5?2.0*v*v:1.0-2.0*(1.0-v)*(1.0-v);return mix(v,s,contrast);}return 0.5+(v-0.5)*(1.0+contrast*0.65);}
    vec4 look(float v){float i=floor(clamp(v,0.0,1.0)*1023.0+0.5);return texture2D(lut,vec2((i+0.5)/1024.0,0.5));}
    void main(){
      vec4 src=texture2D(image,vec2(uv.x,1.0-uv.y));vec3 c=src.rgb;
      c*=vec3(1.0+0.25*temperature,1.0,1.0-0.25*temperature);
      if(exposure!=0.0)c=vec3(expose(c.r),expose(c.g),expose(c.b));
      if(contrast!=0.0)c=vec3(tone(c.r),tone(c.g),tone(c.b));
      float y=dot(c,vec3(0.2126,0.7152,0.0722));c=vec3(y)+(c-vec3(y))*(1.0+saturation);
      if(curves){c=vec3(look(c.r).a,look(c.g).a,look(c.b).a);c=vec3(look(c.r).r,look(c.g).g,look(c.b).b);}
      gl_FragColor=vec4(clamp(c,0.0,1.0),src.a);
    }`;
  function initialize() {
    const canvas = document.createElement('canvas');
    gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
      preserveDrawingBuffer: true,
      depth: false,
      stencil: false
    });
    if (!gl || !gl.getExtension('OES_texture_float')) throw Error('WebGL indisponível');
    canvas.addEventListener('webglcontextlost', e => {
      e.preventDefault();
      disabled = true;
      api.available = false;
      PS.doc.requestPreview();
    });
    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error('Shader indisponível');
      return shader;
    };
    const vs = compile(gl.VERTEX_SHADER, vertex),
      fs = compile(gl.FRAGMENT_SHADER, fragment);
    program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error('Programa indisponível');
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    const texture = unit => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return tex;
    };
    sourceTexture = texture(0);
    lutTexture = texture(1);
    for (const name of ['image', 'lut', 'exposure', 'temperature', 'contrast', 'saturation', 'curves']) uniforms[name] = gl.getUniformLocation(program, name);
    gl.uniform1i(uniforms.image, 0);
    gl.uniform1i(uniforms.lut, 1);
    api.available = true;
  }
  api.render = (source, params, version) => {
    if (!api.enabled || disabled) return null;
    for (const key of Object.keys(neutral)) if (!supported.has(key) && JSON.stringify(params[key] ?? neutral[key]) !== JSON.stringify(neutral[key])) return null;
    try {
      if (!gl) initialize();
      if (gl.isContextLost()) return null;
      if (gl.canvas.width !== source.width || gl.canvas.height !== source.height) {
        gl.canvas.width = source.width;
        gl.canvas.height = source.height;
        output = PS.canvas(source.width, source.height);
        uploadedSource = null;
      }
      gl.viewport(0, 0, source.width, source.height);
      gl.useProgram(program);
      if (uploadedSource !== source || uploadedVersion !== version) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        uploadedSource = source;
        uploadedVersion = version;
      }
      const key = JSON.stringify(params.curves || neutral.curves);
      if (key !== lastCurves) {
        const cv = params.curves || neutral.curves,
          channels = ['r', 'g', 'b', 'rgb'].map(c => IP.curveLUT(cv[c], 1024)),
          data = new Float32Array(4096);
        for (let i = 0; i < 1024; i++) for (let c = 0; c < 4; c++) data[i * 4 + c] = channels[c][i];
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, lutTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1024, 1, 0, gl.RGBA, gl.FLOAT, data);
        curvesOn = key !== JSON.stringify(neutral.curves);
        lastCurves = key;
      }
      gl.uniform1f(uniforms.exposure, params.exposure || 0);
      gl.uniform1f(uniforms.temperature, (params.temperature || 0) / 100);
      gl.uniform1f(uniforms.contrast, (params.contrast || 0) / 100);
      gl.uniform1f(uniforms.saturation, (params.saturation || 0) / 100);
      gl.uniform1i(uniforms.curves, curvesOn ? 1 : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (gl.getError() !== gl.NO_ERROR) throw Error('Falha na prévia');
      if (!output) output = PS.canvas(source.width, source.height);
      const ctx = PS.ctx(output);
      ctx.clearRect(0, 0, output.width, output.height);
      ctx.drawImage(gl.canvas, 0, 0);
      return output;
    } catch (_) {
      disabled = true;
      api.available = false;
      return null;
    }
  };
})();
