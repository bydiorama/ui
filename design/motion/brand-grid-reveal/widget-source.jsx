(
    <div style={{ backgroundColor: '#FDFCFB', borderColor: '#DAD4CE', borderRadius: '16px', borderStyle: 'solid', borderWidth: '1px', boxShadow: '#1D1B1914 0px 8px 32px, #1D1B190A 0px 2px 4px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', fontSynthesis: 'none', height: '304px', MozOsxFontSmoothing: 'grayscale', overflow: 'clip', overflowWrap: 'anywhere', WebkitFontSmoothing: 'antialiased', width: '448px' }}>
      <div style={{ alignItems: 'center', backgroundColor: '#F6F3F0', borderBottomColor: '#EDE8E3', borderBottomStyle: 'solid', borderBottomWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '40px', justifyContent: 'space-between', paddingInline: '16px' }}>
        <div style={{ boxSizing: 'border-box', color: '#1D1B19', fontFamily: '"Paper Mono", ui-monospace, "SFMono-Regular", "SF Mono", "Menlo", "Consolas", "Liberation Mono", monospace', fontSize: '11px', lineHeight: '16px' }}>
          diorama / UI / build.ts
        </div>
        <div style={{ boxSizing: 'border-box', color: '#69635D', fontFamily: '"Paper Mono", ui-monospace, "SFMono-Regular", "SF Mono", "Menlo", "Consolas", "Liberation Mono", monospace', fontSize: '11px', lineHeight: '16px' }}>
          Tokens
        </div>
      </div>
      <div style={{ backgroundColor: '#EDE8E4', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', height: '222px', overflow: 'clip', paddingBlock: '16px', paddingInline: '20px', position: 'relative' }}>
        <div style={{ boxSizing: 'border-box', color: '#69635D', fontFamily: '"Paper Mono", ui-monospace, "SFMono-Regular", "SF Mono", "Menlo", "Consolas", "Liberation Mono", monospace', fontSize: '11px', lineHeight: '22px', whiteSpace: 'pre', width: 'max-content' }}>
          01{'  '}const tokens = {<br />02{'    '}surface: '#FFFFFF',<br />03{'    '}accent:{'  '}'#9EDBF3',<br />04{'    '}edge:{'    '}'#DAD4CE',<br />05{'    '}radius:{'  '}16,<br />06{'    '}inset:{'   '}1,<br />07{'    '}inner:{'   '}15,<br />08{'  '}};<br />09{'  '}// Demo / app frame<br />10{'  '}const layout = {<br />11{'    '}frame: [1280, 784],<br />12{'    '}origin: [160, 208],<br />13{'    '}sidebar: 240,<br />14{'    '}content: 616,<br />15{'    '}gap: 8,<br />16{'    '}cards: [304, 272],<br />17{'  '}};<br />18{'  '}// registry/ui/button/button.tsx<br />19{'  '}const SOFT_RADIUS = {<br />20{'    '}lg: 'rounded-md',<br />21{'    '}md: 'rounded-md',<br />22{'    '}sm: 'rounded-sm',<br />23{'  '}};<br />24{'  '}// Demo / concentric card clip<br />25{'  '}const innerRadius = Math.max(<br />26{'    '}0, outerRadius - tokens.inset<br />27{'  '});<br />28{'  '}const motion = {<br />29{'    '}trace: 320, paint: 250,<br />30{'    '}corners: 390,<br />31{'    '}ease: [.22, 1, .36, 1],<br />32{'    '}photo: 420, stagger: 40,<br />33{'  '}};<br />34{'  '}const enter = {<br />35{'    '}shell: .04, heading: .38,<br />36{'    '}cards: [1.02, 1.16],<br />37{'    '}metrics: [1.70, 1.82, 1.94],<br />38{'  '}};<br />39{'  '}// Demo / responsive metrics<br />40{'  '}const views = { from: 1200, to: 1300 };<br />41{'  '}const storage = { from: .70, to: .72 };<br />42{'  '}const members = { from: 14, to: 15 };<br />43{'  '}const share = .70 + .02 * progress;<br />44{'  '}const sweep = share * Math.PI * 2;<br />45{'  '}const graphDuration = 400;<br />46{'  '}// Update number, label and graph together.<br />47{'  '}// Deterministic rendering / 60 fps<br />48{'  '}const duration = 9.5;<br />49{'  '}const fps = 60;<br />50{'  '}const frames = duration * fps;<br />51{'  '}for (let frame = 0; frame < frames; frame++) {<br />52{'    '}seek(frame / fps);<br />53{'  '}}<br />54{'  '}// Last state returns to the opening grid.<br />55{'  '}// Reduced motion skips the entire reveal.
        </div>
        <div style={{ backgroundImage: 'linear-gradient(in oklab 180deg, #EDE5E2 0%, #FDFCFB00 100%)', boxSizing: 'border-box', height: '20px', left: '0px', position: 'absolute', right: '0px', top: '0px' }} />
        <div style={{ backgroundImage: 'linear-gradient(in oklab 180deg, #FDFCFB00 0%, #EDE5E2 100%)', bottom: '0px', boxSizing: 'border-box', height: '32px', left: '0px', position: 'absolute', right: '0px' }} />
      </div>
      <div style={{ alignItems: 'center', backgroundColor: '#F6F3F0', borderTopColor: '#EDE8E3', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '40px', justifyContent: 'space-between', paddingInline: '16px' }}>
        <div style={{ boxSizing: 'border-box', color: '#69635D', fontFamily: '"Paper Mono", ui-monospace, "SFMono-Regular", "SF Mono", "Menlo", "Consolas", "Liberation Mono", monospace', fontSize: '11px', lineHeight: '16px' }}>
          Generating...
        </div>
        <div style={{ boxSizing: 'border-box', color: '#69635D', fontFamily: '"Paper Mono", ui-monospace, "SFMono-Regular", "SF Mono", "Menlo", "Consolas", "Liberation Mono", monospace', fontSize: '11px', lineHeight: '16px' }}>
          55 lines
        </div>
      </div>
    </div>
  )
