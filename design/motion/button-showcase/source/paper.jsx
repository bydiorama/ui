/** @paper-design/shaders-react@0.0.81 */
import { DotGrid } from '@paper-design/shaders-react';

(
    <div style={{ backgroundImage: 'linear-gradient(in oklab 180deg, #EDE8E3 0%, #DAD4CE 100%)', boxSizing: 'border-box', fontSize: '12px', fontSynthesis: 'none', height: '1200px', lineHeight: '16px', MozOsxFontSmoothing: 'grayscale', overflow: 'clip', overflowWrap: 'anywhere', position: 'relative', WebkitFontSmoothing: 'antialiased', width: '1600px' }}>
      <DotGrid size={1.5} gapY={16} gapX={16} strokeWidth={0} sizeRange={0} opacityRange={0} shape="circle" colorStroke="#00000000" colorFill="#11111114" colorBack="#00000000" style={{ bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 }} />
      <div style={{ alignItems: 'center', backgroundColor: '#F6F3F0', backgroundImage: 'linear-gradient(in oklab 180deg, #FDFCFB 0%, #F6F3F0 100%)', borderRadius: '24px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '32px', height: 'fit-content', justifyContent: 'center', left: 240, padding: '64px', position: 'absolute', top: 56, width: '1120px' }}>
        <div style={{ alignSelf: 'stretch', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', fontSynthesisSmallCaps: 'none', fontSynthesisStyle: 'none', fontSynthesisWeight: 'none', gap: '64px' }}>
          <div style={{ alignSelf: 'stretch', boxSizing: 'border-box', display: 'flex', gap: '16px' }}>
            <div style={{ boxSizing: 'border-box', color: '#1D1B19', fontFamily: '"Aspekta-500", "Aspekta", system-ui, sans-serif', fontSize: '24px', fontWeight: 500, height: 'fit-content', letterSpacing: '-0.02em', lineHeight: '135%', width: 'round(20%, 1px)' }}>
              Button
            </div>
            <div style={{ alignItems: 'start', alignSelf: 'stretch', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
              <div style={{ alignSelf: 'stretch', boxSizing: 'border-box', color: '#69635D', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '14px', letterSpacing: '-0.01em', lineHeight: '135%' }}>
                Every type is either a fill with a matching edge, or an edge on nothing. A fill with no edge is not a button — it is page chrome. Pressed adds no fill of its own: it firms the edge and the ink, because a pointer press is already a hover.
              </div>
            </div>
          </div>
          <div style={{ alignSelf: 'stretch', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ alignSelf: 'stretch', boxSizing: 'border-box', display: 'flex', gap: '16px' }}>
              <div style={{ boxSizing: 'border-box', color: '#1D1B19', fontFamily: '"Aspekta-500", "Aspekta", system-ui, sans-serif', fontSize: '20px', fontWeight: 500, height: 'fit-content', letterSpacing: '-0.02em', lineHeight: '135%', width: 'round(20%, 1px)' }}>
                Anatomy
              </div>
              <div style={{ alignItems: 'start', alignSelf: 'stretch', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                <div style={{ alignSelf: 'stretch', boxSizing: 'border-box', color: '#69635D', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '13px', letterSpacing: '-0.01em', lineHeight: '135%' }}>
                  The edge is an inset ring, so it costs no layout and leaves outline free for focus. Both icon slots are 16px at every size.
                </div>
              </div>
            </div>
            <div style={{ alignItems: 'start', boxSizing: 'border-box', display: 'flex', gap: '16px' }}>
              <div style={{ alignItems: 'center', backgroundColor: '#9EDBF3', borderRadius: '8px', boxShadow: '#9EDBF3 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', gap: '8px', height: '44px', justifyContent: 'center', paddingInline: '16px' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style={{ width: '16px', height: '16px', flexShrink: '0' }}>
                  <path d="M8 3.5v9M3.5 8h9" fill="none" stroke="#1D1B19" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '16px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                  Create new
                </div>
                <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style={{ width: '16px', height: '16px', flexShrink: '0' }}>
                  <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="#1D1B19" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div style={{ boxSizing: 'border-box', display: 'flex', flex: 1, flexDirection: 'column', gap: '8px', paddingLeft: '32px' }}>
                <div style={{ alignItems: 'center', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', paddingBlock: '8px' }}>
                  <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', flexShrink: '0', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%', width: '120px' }}>
                    ring
                  </div>
                  <div style={{ boxSizing: 'border-box', color: '#69635D', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '100%' }}>
                    1.5px, inset. A box-shadow, not a border — a border would add 3px to a 44px control.
                  </div>
                </div>
                <div style={{ alignItems: 'center', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', paddingBlock: '8px' }}>
                  <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', flexShrink: '0', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%', width: '120px' }}>
                    icon
                  </div>
                  <div style={{ boxSizing: 'border-box', color: '#69635D', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '100%' }}>
                    16px at lg, md and sm alike. The component sizes the slot; the icon set does not.
                  </div>
                </div>
                <div style={{ alignItems: 'center', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', paddingBlock: '8px' }}>
                  <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', flexShrink: '0', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%', width: '120px' }}>
                    label
                  </div>
                  <div style={{ boxSizing: 'border-box', color: '#69635D', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '100%' }}>
                    weight 600, leading flat, tracking tight. 16px at lg, 12px at md and sm.
                  </div>
                </div>
                <div style={{ alignItems: 'center', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', paddingBlock: '8px' }}>
                  <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', flexShrink: '0', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%', width: '120px' }}>
                    iconEnd
                  </div>
                  <div style={{ boxSizing: 'border-box', color: '#69635D', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '100%' }}>
                    Trailing slot. Chevrons and external-link marks.
                  </div>
                </div>
                <div style={{ alignItems: 'center', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', paddingBlock: '8px' }}>
                  <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', flexShrink: '0', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%', width: '120px' }}>
                    focus outline
                  </div>
                  <div style={{ boxSizing: 'border-box', color: '#69635D', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '100%' }}>
                    2px offset 2px, OUTSIDE the box. Its own layer, so no variant's ring can be mistaken for it.
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ alignSelf: 'stretch', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ alignItems: 'start', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '16px' }}>
              <div style={{ boxSizing: 'border-box', color: '#1D1B19', fontFamily: '"Aspekta-500", "Aspekta", system-ui, sans-serif', fontSize: '20px', fontWeight: 500, height: 'fit-content', letterSpacing: '-0.02em', lineHeight: '135%', width: 'round(20%, 1px)' }}>
                Busy and full width
              </div>
              <div style={{ boxSizing: 'border-box', color: '#69635D', flex: 1, fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '13px', letterSpacing: '-0.01em', lineHeight: '135%' }}>
                isBusy is not isDisabled. A control that leaves the tab order mid-submit strands the keyboard user standing on it, so busy keeps focus, stays operable, and announces with aria-busy.
              </div>
              <div style={{ alignItems: 'start', alignSelf: 'stretch', boxSizing: 'border-box', display: 'flex', flex: 1, flexDirection: 'column' }} />
            </div>
            <div style={{ alignSelf: 'stretch', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
              <div style={{ alignItems: 'center', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '16px' }}>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '2px', width: '220px' }}>
                  <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%' }}>
                    lg · 44px
                  </div>
                  <div style={{ boxSizing: 'border-box', color: '#69635D', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '135%' }}>
                    px-lg 16 · gap-sm 8 · label 16 · soft radius-md 8
                  </div>
                </div>
                <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '16px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: '#9EDBF3', borderRadius: '8px', boxShadow: '#9EDBF3 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', gap: '8px', height: '44px', justifyContent: 'center', paddingInline: '16px' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style={{ width: '16px', height: '16px', flexShrink: '0' }}>
                      <path d="M8 3.5v9M3.5 8h9" fill="none" stroke="#1D1B19" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '16px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Create new
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', backgroundColor: '#9EDBF3', borderRadius: '999px', boxShadow: '#9EDBF3 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', gap: '8px', height: '44px', justifyContent: 'center', paddingInline: '16px' }}>
                    <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '16px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Rounded full
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', backgroundColor: '#9EDBF3', borderRadius: '8px', boxShadow: '#9EDBF3 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '44px', justifyContent: 'center', width: '44px' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style={{ width: '16px', height: '16px', flexShrink: '0' }}>
                      <path d="M8 3.5v9M3.5 8h9" fill="none" stroke="#1D1B19" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>
              <div style={{ alignItems: 'center', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '16px' }}>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '2px', width: '220px' }}>
                  <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%' }}>
                    md · 32px — default
                  </div>
                  <div style={{ boxSizing: 'border-box', color: '#69635D', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '135%' }}>
                    px-md 12 · gap-sm 8 · label 12 · soft radius-md 8
                  </div>
                </div>
                <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '16px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: '#9EDBF3', borderRadius: '8px', boxShadow: '#9EDBF3 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', gap: '8px', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style={{ width: '16px', height: '16px', flexShrink: '0' }}>
                      <path d="M8 3.5v9M3.5 8h9" fill="none" stroke="#1D1B19" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Create new
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', backgroundColor: '#9EDBF3', borderRadius: '999px', boxShadow: '#9EDBF3 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', gap: '8px', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Rounded full
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', backgroundColor: '#9EDBF3', borderRadius: '8px', boxShadow: '#9EDBF3 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '32px', justifyContent: 'center', width: '32px' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style={{ width: '16px', height: '16px', flexShrink: '0' }}>
                      <path d="M8 3.5v9M3.5 8h9" fill="none" stroke="#1D1B19" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>
              <div style={{ alignItems: 'center', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '16px' }}>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '2px', width: '220px' }}>
                  <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%' }}>
                    sm · 24px
                  </div>
                  <div style={{ boxSizing: 'border-box', color: '#69635D', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '135%' }}>
                    px-sm 8 · gap-xs 4 · label 12 · soft radius-sm 4
                  </div>
                </div>
                <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '16px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: '#9EDBF3', borderRadius: '4px', boxShadow: '#9EDBF3 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', gap: '4px', height: '24px', justifyContent: 'center', paddingInline: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style={{ width: '16px', height: '16px', flexShrink: '0' }}>
                      <path d="M8 3.5v9M3.5 8h9" fill="none" stroke="#1D1B19" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Create new
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', backgroundColor: '#9EDBF3', borderRadius: '999px', boxShadow: '#9EDBF3 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', gap: '4px', height: '24px', justifyContent: 'center', paddingInline: '8px' }}>
                    <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Rounded full
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', backgroundColor: '#9EDBF3', borderRadius: '4px', boxShadow: '#9EDBF3 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', flexShrink: '0', height: '24px', justifyContent: 'center', width: '24px' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style={{ width: '16px', height: '16px', flexShrink: '0' }}>
                      <path d="M8 3.5v9M3.5 8h9" fill="none" stroke="#1D1B19" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ alignSelf: 'stretch', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ alignItems: 'start', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '16px' }}>
              <div style={{ boxSizing: 'border-box', color: '#1D1B19', fontFamily: '"Aspekta-500", "Aspekta", system-ui, sans-serif', fontSize: '20px', fontWeight: 500, height: 'fit-content', letterSpacing: '-0.02em', lineHeight: '135%', width: 'round(20%, 1px)' }}>
                Busy and full width
              </div>
              <div style={{ boxSizing: 'border-box', color: '#69635D', flex: 1, fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '13px', letterSpacing: '-0.01em', lineHeight: '135%' }}>
                isBusy is not isDisabled. A control that leaves the tab order mid-submit strands the keyboard user standing on it, so busy keeps focus, stays operable, and announces with aria-busy.
              </div>
              <div style={{ alignItems: 'start', alignSelf: 'stretch', boxSizing: 'border-box', display: 'flex', flex: 1, flexDirection: 'column' }} />
            </div>
            <div style={{ alignSelf: 'stretch', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
              <div style={{ alignItems: 'flex-end', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBottom: '12px' }}>
                <div style={{ boxSizing: 'border-box', flexShrink: '0', width: '220px' }} />
                <div style={{ boxSizing: 'border-box', color: '#1D1B19', flexShrink: '0', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%', width: '150px' }}>
                  primary
                </div>
                <div style={{ boxSizing: 'border-box', color: '#1D1B19', flexShrink: '0', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%', width: '150px' }}>
                  secondary
                </div>
                <div style={{ boxSizing: 'border-box', color: '#1D1B19', flexShrink: '0', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%', width: '150px' }}>
                  outline
                </div>
                <div style={{ boxSizing: 'border-box', color: '#1D1B19', flexShrink: '0', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%', width: '150px' }}>
                  ghost
                </div>
                <div style={{ boxSizing: 'border-box', color: '#1D1B19', flexShrink: '0', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%', width: '150px' }}>
                  danger
                </div>
              </div>
              <div style={{ alignItems: 'center', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '8px' }}>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '2px', paddingRight: '16px', width: '220px' }}>
                  <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%' }}>
                    rest
                  </div>
                  <div style={{ boxSizing: 'border-box', color: '#69635D', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '135%' }}>
                    a fill with a matching edge, or an edge on nothing
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexShrink: '0', width: '150px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: '#9EDBF3', borderRadius: '8px', boxShadow: '#9EDBF3 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Create new
                    </div>
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexShrink: '0', width: '150px' }}>
                  <div style={{ alignItems: 'center', borderRadius: '8px', boxShadow: '#DAD4CE 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: '#69635D', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Create new
                    </div>
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexShrink: '0', width: '150px' }}>
                  <div style={{ alignItems: 'center', borderRadius: '8px', boxShadow: '#98918A 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: '#2F2C29', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Create new
                    </div>
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexShrink: '0', width: '150px' }}>
                  <div style={{ alignItems: 'center', borderRadius: '8px', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: '#2F2C29', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Create new
                    </div>
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexShrink: '0', width: '150px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: '#F9E2DB', borderRadius: '8px', boxShadow: '#F6CEC2 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: '#6A2C18', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Delete
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ alignItems: 'center', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '8px' }}>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '2px', paddingRight: '16px', width: '220px' }}>
                  <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%' }}>
                    hover
                  </div>
                  <div style={{ boxSizing: 'border-box', color: '#69635D', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '135%' }}>
                    primary and danger deepen their fill; ghost gains bg-elevated; secondary and outline firm the ring only
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexShrink: '0', width: '150px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: '#79B8D3', borderRadius: '8px', boxShadow: '#79B8D3 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Create new
                    </div>
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexShrink: '0', width: '150px' }}>
                  <div style={{ alignItems: 'center', borderRadius: '8px', boxShadow: '#B7B0A9 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: '#2F2C29', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Create new
                    </div>
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexShrink: '0', width: '150px' }}>
                  <div style={{ alignItems: 'center', borderRadius: '8px', boxShadow: '#69635D 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: '#2F2C29', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Create new
                    </div>
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexShrink: '0', width: '150px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: '#F6F3F0', borderRadius: '8px', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: '#2F2C29', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Create new
                    </div>
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexShrink: '0', width: '150px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: '#F6CEC2', borderRadius: '8px', boxShadow: '#F6CEC2 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: '#6A2C18', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Delete
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ alignItems: 'center', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '8px' }}>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '2px', paddingRight: '16px', width: '220px' }}>
                  <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%' }}>
                    pressed
                  </div>
                  <div style={{ boxSizing: 'border-box', color: '#69635D', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '135%' }}>
                    NO new fill. The ring goes to border-strong and the ink to text-primary; a press is already a hover, so hover's fill is what you see. danger has no pressed step of its own — it holds its hover tint
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexShrink: '0', width: '150px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: '#5799B1', borderRadius: '8px', boxShadow: '#5799B1 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Create new
                    </div>
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexShrink: '0', width: '150px' }}>
                  <div style={{ alignItems: 'center', borderRadius: '8px', boxShadow: '#69635D 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Create new
                    </div>
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexShrink: '0', width: '150px' }}>
                  <div style={{ alignItems: 'center', borderRadius: '8px', boxShadow: '#69635D 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Create new
                    </div>
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexShrink: '0', width: '150px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: '#F6F3F0', borderRadius: '8px', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Create new
                    </div>
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexShrink: '0', width: '150px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: '#F6CEC2', borderRadius: '8px', boxShadow: '#F6CEC2 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: '#6A2C18', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Delete
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ alignItems: 'center', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '8px' }}>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '2px', paddingRight: '16px', width: '220px' }}>
                  <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%' }}>
                    focus-visible
                  </div>
                  <div style={{ boxSizing: 'border-box', color: '#69635D', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '135%' }}>
                    2px outline, offset 2px, border-focus. Outside the box and on its own layer — it survives forced-colors, a ring would not
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexShrink: '0', width: '150px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: '#9EDBF3', borderRadius: '8px', boxShadow: '#9EDBF3 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', outline: '2px solid #1B6C84', outlineOffset: '2px', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Create new
                    </div>
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexShrink: '0', width: '150px' }}>
                  <div style={{ alignItems: 'center', borderRadius: '8px', boxShadow: '#DAD4CE 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', outline: '2px solid #1B6C84', outlineOffset: '2px', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: '#69635D', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Create new
                    </div>
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexShrink: '0', width: '150px' }}>
                  <div style={{ alignItems: 'center', borderRadius: '8px', boxShadow: '#98918A 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', outline: '2px solid #1B6C84', outlineOffset: '2px', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: '#2F2C29', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Create new
                    </div>
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexShrink: '0', width: '150px' }}>
                  <div style={{ alignItems: 'center', borderRadius: '8px', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', outline: '2px solid #1B6C84', outlineOffset: '2px', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: '#2F2C29', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Create new
                    </div>
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexShrink: '0', width: '150px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: '#F9E2DB', borderRadius: '8px', boxShadow: '#F6CEC2 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', outline: '2px solid #1B6C84', outlineOffset: '2px', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: '#6A2C18', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Delete
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ alignItems: 'center', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '8px' }}>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '2px', paddingRight: '16px', width: '220px' }}>
                  <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%' }}>
                    disabled
                  </div>
                  <div style={{ boxSizing: 'border-box', color: '#69635D', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '135%' }}>
                    bg-elevated, ring the same value so the control flattens, ink text-disabled. Identical across all five types
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexShrink: '0', width: '150px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: '#F6F3F0', borderRadius: '8px', boxShadow: '#F6F3F0 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: '#B7B0A9', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Create new
                    </div>
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexShrink: '0', width: '150px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: '#F6F3F0', borderRadius: '8px', boxShadow: '#F6F3F0 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: '#B7B0A9', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Create new
                    </div>
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexShrink: '0', width: '150px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: '#F6F3F0', borderRadius: '8px', boxShadow: '#F6F3F0 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: '#B7B0A9', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Create new
                    </div>
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexShrink: '0', width: '150px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: '#F6F3F0', borderRadius: '8px', boxShadow: '#F6F3F0 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: '#B7B0A9', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Create new
                    </div>
                  </div>
                </div>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexShrink: '0', width: '150px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: '#F6F3F0', borderRadius: '8px', boxShadow: '#F6F3F0 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                    <div style={{ boxSizing: 'border-box', color: '#B7B0A9', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Delete
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ alignSelf: 'stretch', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ alignItems: 'start', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '16px' }}>
              <div style={{ boxSizing: 'border-box', color: '#1D1B19', fontFamily: '"Aspekta-500", "Aspekta", system-ui, sans-serif', fontSize: '20px', fontWeight: 500, height: 'fit-content', letterSpacing: '-0.02em', lineHeight: '135%', width: 'round(20%, 1px)' }}>
                Busy and full width
              </div>
              <div style={{ boxSizing: 'border-box', color: '#69635D', flex: 1, fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '13px', letterSpacing: '-0.01em', lineHeight: '135%' }}>
                isBusy is not isDisabled. A control that leaves the tab order mid-submit strands the keyboard user standing on it, so busy keeps focus, stays operable, and announces with aria-busy.
              </div>
              <div style={{ alignItems: 'start', alignSelf: 'stretch', boxSizing: 'border-box', display: 'flex', flex: 1, flexDirection: 'column' }} />
            </div>
            <div style={{ alignItems: 'start', alignSelf: 'stretch', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
              <div style={{ alignItems: 'center', alignSelf: 'stretch', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '8px' }}>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '2px', paddingRight: '16px', width: '220px' }}>
                  <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%' }}>
                    busy
                  </div>
                  <div style={{ boxSizing: 'border-box', color: '#69635D', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '135%' }}>
                    the spinner REPLACES the leading icon rather than joining it, so the control keeps its width under a pointer that is still on it
                  </div>
                </div>
                <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', gap: '16px' }}>
                  <div style={{ alignItems: 'center', backgroundColor: '#9EDBF3', borderRadius: '8px', boxShadow: '#9EDBF3 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', gap: '8px', height: '44px', justifyContent: 'center', paddingInline: '16px' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style={{ width: '16px', height: '16px', flexShrink: '0' }}>
                      <circle cx="8" cy="8" r="6" fill="none" stroke="#1D1B19" strokeWidth="2" strokeLinecap="round" strokeDasharray="28 10" />
                    </svg>
                    <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '16px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Signing in
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', borderRadius: '8px', boxShadow: '#DAD4CE 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', gap: '8px', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" style={{ width: '16px', height: '16px', flexShrink: '0' }}>
                      <circle cx="8" cy="8" r="6" fill="none" stroke="#69635D" strokeWidth="2" strokeLinecap="round" strokeDasharray="28 10" />
                    </svg>
                    <div style={{ boxSizing: 'border-box', color: '#69635D', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                      Saving
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ alignItems: 'center', alignSelf: 'stretch', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '8px' }}>
                <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', flexShrink: '0', gap: '2px', paddingRight: '16px', width: '220px' }}>
                  <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%' }}>
                    isFullWidth
                  </div>
                  <div style={{ boxSizing: 'border-box', color: '#69635D', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '135%' }}>
                    stretches to the container. The height, padding and label do not change
                  </div>
                </div>
                <div style={{ alignItems: 'center', backgroundColor: '#9EDBF3', borderRadius: '999px', boxShadow: '#9EDBF3 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', flexBasis: '0%', flexGrow: '1', height: '44px', justifyContent: 'center', paddingInline: '16px' }}>
                  <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '16px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                    Create new
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ alignSelf: 'stretch', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ alignSelf: 'stretch', boxSizing: 'border-box', display: 'flex', gap: '16px' }}>
              <div style={{ alignItems: 'start', alignSelf: 'stretch', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', height: '36px', width: '992px' }} />
            </div>
            <div style={{ alignItems: 'start', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '16px' }}>
              <div style={{ boxSizing: 'border-box', color: '#1D1B19', fontFamily: '"Aspekta-500", "Aspekta", system-ui, sans-serif', fontSize: '20px', fontWeight: 500, height: 'fit-content', letterSpacing: '-0.02em', lineHeight: '135%', width: 'round(20%, 1px)' }}>
                Token map
              </div>
              <div style={{ boxSizing: 'border-box', color: '#69635D', flex: 1, fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '13px', letterSpacing: '-0.01em', lineHeight: '135%' }}>
                Dark is resolved from the theme, not sampled from this page — a flat file cannot hold a light-dark pair. Translucent dark values are shown composited on bg-surface, which is the ground a control sits on there.
              </div>
              <div style={{ alignItems: 'start', alignSelf: 'stretch', boxSizing: 'border-box', display: 'flex', flex: 1, flexDirection: 'column' }} />
            </div>
            <div style={{ alignSelf: 'stretch', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
              <div style={{ alignItems: 'center', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '8px' }}>
                <div style={{ boxSizing: 'border-box', color: '#1D1B19', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%', width: 'round(20%, 1px)' }}>
                  where
                </div>
                <div style={{ boxSizing: 'border-box', color: '#1D1B19', flex: 1, fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%' }}>
                  role
                </div>
                <div style={{ boxSizing: 'border-box', color: '#1D1B19', flex: 1, fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%' }}>
                  light
                </div>
                <div style={{ boxSizing: 'border-box', color: '#1D1B19', flex: 1, fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%' }}>
                  dark
                </div>
              </div>
              <div style={{ alignSelf: 'stretch', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                <div style={{ alignItems: 'center', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '8px' }}>
                  <div style={{ boxSizing: 'border-box', color: '#2F2C29', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '130%', width: 'round(20%, 1px)' }}>
                    primary fill
                  </div>
                  <div style={{ boxSizing: 'border-box', color: '#69635D', flex: 1, fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '130%' }}>
                    --ui-bg-accent → -hover → -active
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flex: 1, gap: '6px' }}>
                    <div style={{ backgroundColor: '#9EDBF3', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ backgroundColor: '#79B8D3', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ backgroundColor: '#5799B1', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                  </div>
                  <div style={{ alignItems: 'center', backgroundColor: '#2F2C29', borderRadius: '4px', boxSizing: 'border-box', display: 'flex', flex: 1, gap: '8px', padding: '8px' }}>
                    <div style={{ backgroundColor: '#9EDBF3', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ backgroundColor: '#79B8D3', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ backgroundColor: '#5799B1', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ boxSizing: 'border-box', color: '#B7B0A9', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '11px', lineHeight: '100%' }}>
                      unchanged
                    </div>
                  </div>
                </div>
                <div style={{ alignItems: 'center', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '8px' }}>
                  <div style={{ boxSizing: 'border-box', color: '#2F2C29', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '130%', width: 'round(20%, 1px)' }}>
                    primary ink
                  </div>
                  <div style={{ boxSizing: 'border-box', color: '#69635D', flex: 1, fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '130%' }}>
                    --ui-text-on-accent
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flex: 1, gap: '6px' }}>
                    <div style={{ backgroundColor: '#1D1B19', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ boxSizing: 'border-box', color: '#69635D', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '11px', lineHeight: '100%' }}>
                      #1D1B19
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', backgroundColor: '#2F2C29', borderRadius: '4px', boxSizing: 'border-box', display: 'flex', flex: 1, gap: '8px', padding: '8px' }}>
                    <div style={{ backgroundColor: '#1D1B19', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ boxSizing: 'border-box', color: '#B7B0A9', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '11px', lineHeight: '100%' }}>
                      #1D1B19
                    </div>
                  </div>
                </div>
                <div style={{ alignItems: 'center', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '8px' }}>
                  <div style={{ boxSizing: 'border-box', color: '#2F2C29', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '130%', width: 'round(20%, 1px)' }}>
                    secondary edge
                  </div>
                  <div style={{ boxSizing: 'border-box', color: '#69635D', flex: 1, fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '130%' }}>
                    --ui-border-subtle → -default → -strong
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flex: 1, gap: '6px' }}>
                    <div style={{ backgroundColor: '#DAD4CE', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ backgroundColor: '#B7B0A9', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ backgroundColor: '#69635D', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                  </div>
                  <div style={{ alignItems: 'center', backgroundColor: '#2F2C29', borderRadius: '4px', boxSizing: 'border-box', display: 'flex', flex: 1, gap: '8px', padding: '8px' }}>
                    <div style={{ backgroundColor: '#F6F3F024', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ backgroundColor: '#6F6C6A', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ backgroundColor: '#B2AFAC', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ boxSizing: 'border-box', color: '#B7B0A9', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '11px', lineHeight: '100%' }}>
                      inverts
                    </div>
                  </div>
                </div>
                <div style={{ alignItems: 'center', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '8px' }}>
                  <div style={{ boxSizing: 'border-box', color: '#2F2C29', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '130%', width: 'round(20%, 1px)' }}>
                    secondary ink
                  </div>
                  <div style={{ boxSizing: 'border-box', color: '#69635D', flex: 1, fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '130%' }}>
                    --ui-text-muted → -secondary → -primary
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flex: 1, gap: '6px' }}>
                    <div style={{ backgroundColor: '#69635D', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ backgroundColor: '#2F2C29', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ backgroundColor: '#1D1B19', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                  </div>
                  <div style={{ alignItems: 'center', backgroundColor: '#2F2C29', borderRadius: '4px', boxSizing: 'border-box', display: 'flex', flex: 1, gap: '8px', padding: '8px' }}>
                    <div style={{ backgroundColor: '#B7B0A9', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ backgroundColor: '#E1DEDB', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ backgroundColor: '#F6F3F0', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ boxSizing: 'border-box', color: '#B7B0A9', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '11px', lineHeight: '100%' }}>
                      inverts
                    </div>
                  </div>
                </div>
                <div style={{ alignItems: 'center', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '8px' }}>
                  <div style={{ boxSizing: 'border-box', color: '#2F2C29', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '130%', width: 'round(20%, 1px)' }}>
                    outline edge
                  </div>
                  <div style={{ boxSizing: 'border-box', color: '#69635D', flex: 1, fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '130%' }}>
                    --ui-border-control → -strong — 3:1, SC 1.4.11
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flex: 1, gap: '6px' }}>
                    <div style={{ backgroundColor: '#98918A', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ backgroundColor: '#69635D', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                  </div>
                  <div style={{ alignItems: 'center', backgroundColor: '#2F2C29', borderRadius: '4px', boxSizing: 'border-box', display: 'flex', flex: 1, gap: '8px', padding: '8px' }}>
                    <div style={{ backgroundColor: '#8D8A88', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ backgroundColor: '#B2AFAC', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                  </div>
                </div>
                <div style={{ alignItems: 'center', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '8px' }}>
                  <div style={{ boxSizing: 'border-box', color: '#2F2C29', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '130%', width: 'round(20%, 1px)' }}>
                    ghost fill
                  </div>
                  <div style={{ boxSizing: 'border-box', color: '#69635D', flex: 1, fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '130%' }}>
                    none → --ui-bg-elevated (hover and pressed)
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flex: 1, gap: '6px' }}>
                    <div style={{ backgroundColor: '#F6F3F0', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ boxSizing: 'border-box', color: '#69635D', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '11px', lineHeight: '100%' }}>
                      #F6F3F0
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', backgroundColor: '#2F2C29', borderRadius: '4px', boxSizing: 'border-box', display: 'flex', flex: 1, gap: '8px', padding: '8px' }}>
                    <div style={{ backgroundColor: '#3E3B38', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ boxSizing: 'border-box', color: '#B7B0A9', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '11px', lineHeight: '100%' }}>
                      #3e3b38
                    </div>
                  </div>
                </div>
                <div style={{ alignItems: 'center', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '8px' }}>
                  <div style={{ boxSizing: 'border-box', color: '#2F2C29', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '130%', width: 'round(20%, 1px)' }}>
                    danger surface
                  </div>
                  <div style={{ boxSizing: 'border-box', color: '#69635D', flex: 1, fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '130%' }}>
                    --ui-intent-danger-bg / -border / -bg-hover
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flex: 1, gap: '6px' }}>
                    <div style={{ backgroundColor: '#F9E2DB', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ backgroundColor: '#F6CEC2', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                  </div>
                  <div style={{ alignItems: 'center', backgroundColor: '#2F2C29', borderRadius: '4px', boxSizing: 'border-box', display: 'flex', flex: 1, gap: '8px', padding: '8px' }}>
                    <div style={{ backgroundColor: '#D4744A2E', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ backgroundColor: '#D4744A5C', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ boxSizing: 'border-box', color: '#B7B0A9', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '11px', lineHeight: '100%' }}>
                      alpha
                    </div>
                  </div>
                </div>
                <div style={{ alignItems: 'center', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '8px' }}>
                  <div style={{ boxSizing: 'border-box', color: '#2F2C29', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '130%', width: 'round(20%, 1px)' }}>
                    danger ink
                  </div>
                  <div style={{ boxSizing: 'border-box', color: '#69635D', flex: 1, fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '130%' }}>
                    --ui-text-on-danger-subtle
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flex: 1, gap: '6px' }}>
                    <div style={{ backgroundColor: '#6A2C18', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ boxSizing: 'border-box', color: '#69635D', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '11px', lineHeight: '100%' }}>
                      #6A2C18
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', backgroundColor: '#2F2C29', borderRadius: '4px', boxSizing: 'border-box', display: 'flex', flex: 1, gap: '8px', padding: '8px' }}>
                    <div style={{ backgroundColor: '#F6CEC2', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ boxSizing: 'border-box', color: '#B7B0A9', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '11px', lineHeight: '100%' }}>
                      #F6CEC2
                    </div>
                  </div>
                </div>
                <div style={{ alignItems: 'center', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '8px' }}>
                  <div style={{ boxSizing: 'border-box', color: '#2F2C29', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '130%', width: 'round(20%, 1px)' }}>
                    focus outline
                  </div>
                  <div style={{ boxSizing: 'border-box', color: '#69635D', flex: 1, fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '130%' }}>
                    --ui-border-focus — 2px, offset 2px
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flex: 1, gap: '6px' }}>
                    <div style={{ backgroundColor: '#1B6C84', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ boxSizing: 'border-box', color: '#69635D', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '11px', lineHeight: '100%' }}>
                      #1B6C84
                    </div>
                  </div>
                  <div style={{ alignItems: 'center', backgroundColor: '#2F2C29', borderRadius: '4px', boxSizing: 'border-box', display: 'flex', flex: 1, gap: '8px', padding: '8px' }}>
                    <div style={{ backgroundColor: '#79B8D3', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ boxSizing: 'border-box', color: '#B7B0A9', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '11px', lineHeight: '100%' }}>
                      #79B8D3
                    </div>
                  </div>
                </div>
                <div style={{ alignItems: 'center', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '8px' }}>
                  <div style={{ boxSizing: 'border-box', color: '#2F2C29', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '130%', width: 'round(20%, 1px)' }}>
                    disabled
                  </div>
                  <div style={{ boxSizing: 'border-box', color: '#69635D', flex: 1, fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '130%' }}>
                    --ui-bg-elevated fill AND ring · --ui-text-disabled
                  </div>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flex: 1, gap: '6px' }}>
                    <div style={{ backgroundColor: '#F6F3F0', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ backgroundColor: '#B7B0A9', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                  </div>
                  <div style={{ alignItems: 'center', backgroundColor: '#2F2C29', borderRadius: '4px', boxSizing: 'border-box', display: 'flex', flex: 1, gap: '8px', padding: '8px' }}>
                    <div style={{ backgroundColor: '#3E3B38', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                    <div style={{ backgroundColor: '#817A73', borderRadius: '3px', boxSizing: 'border-box', flexShrink: '0', height: '14px', width: '14px' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div style={{ alignSelf: 'stretch', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ alignSelf: 'stretch', boxSizing: 'border-box', display: 'flex', gap: '16px' }}>
              <div style={{ boxSizing: 'border-box', color: '#1D1B19', fontFamily: '"Aspekta-500", "Aspekta", system-ui, sans-serif', fontSize: '20px', fontWeight: 500, height: 'fit-content', letterSpacing: '-0.02em', lineHeight: '135%', width: 'round(20%, 1px)' }}>
                Dark
              </div>
              <div style={{ alignItems: 'start', alignSelf: 'stretch', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                <div style={{ alignSelf: 'stretch', boxSizing: 'border-box', color: '#69635D', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '13px', letterSpacing: '-0.01em', lineHeight: '135%' }}>
                  Drawn on bg-surface, which is the ground a control sits on in dark. Read the ramp as a sequence rather than state by state: the surface scale inverts between schemes, so a hover that darkens in light must lighten here, and both values can be right in isolation while the pair straddles its own background.
                </div>
              </div>
            </div>
            <div style={{ alignItems: 'start', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '16px' }}>
              <div style={{ boxSizing: 'border-box', color: '#1D1B19', fontFamily: '"Aspekta-500", "Aspekta", system-ui, sans-serif', fontSize: '20px', fontWeight: 500, height: 'fit-content', letterSpacing: '-0.02em', lineHeight: '135%', width: 'round(20%, 1px)' }}>
                Busy and full width
              </div>
              <div style={{ boxSizing: 'border-box', color: '#69635D', flex: 1, fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '13px', letterSpacing: '-0.01em', lineHeight: '135%' }}>
                isBusy is not isDisabled. A control that leaves the tab order mid-submit strands the keyboard user standing on it, so busy keeps focus, stays operable, and announces with aria-busy.
              </div>
              <div style={{ alignItems: 'start', alignSelf: 'stretch', boxSizing: 'border-box', display: 'flex', flex: 1, flexDirection: 'column' }} />
            </div>
            <div style={{ alignSelf: 'stretch', backgroundColor: '#2F2C29', borderRadius: '16px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', padding: '32px' }}>
              <div style={{ alignSelf: 'stretch', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                <div style={{ alignItems: 'center', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '8px' }}>
                  <div style={{ boxSizing: 'border-box', height: '0px', width: 'round(20%, 1px)' }} />
                  <div style={{ boxSizing: 'border-box', color: '#F6F3F0', flex: 1, fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%' }}>
                    primary
                  </div>
                  <div style={{ boxSizing: 'border-box', color: '#F6F3F0', flex: 1, fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%' }}>
                    secondary
                  </div>
                  <div style={{ boxSizing: 'border-box', color: '#F6F3F0', flex: 1, fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%' }}>
                    outline
                  </div>
                  <div style={{ boxSizing: 'border-box', color: '#F6F3F0', flex: 1, fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%' }}>
                    ghost
                  </div>
                  <div style={{ boxSizing: 'border-box', color: '#F6F3F0', flex: 1, fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%' }}>
                    danger
                  </div>
                </div>
                <div style={{ alignItems: 'center', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '8px' }}>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flex: 1, gap: 16 }}>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '2px', paddingRight: '16px', width: 'round(20%, 1px)' }}>
                      <div style={{ boxSizing: 'border-box', color: '#F6F3F0', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%' }}>
                        rest
                      </div>
                      <div style={{ boxSizing: 'border-box', color: '#B7B0A9', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '135%' }}>
                        a fill with a matching edge, or an edge on nothing
                      </div>
                    </div>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flex: 1 }}>
                      <div style={{ alignItems: 'center', backgroundColor: '#9EDBF3', borderRadius: '8px', boxShadow: '#9EDBF3 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                        <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                          Create new
                        </div>
                      </div>
                    </div>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flex: 1 }}>
                      <div style={{ alignItems: 'center', borderRadius: '8px', boxShadow: '#F6F3F024 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                        <div style={{ boxSizing: 'border-box', color: '#B7B0A9', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                          Create new
                        </div>
                      </div>
                    </div>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flex: 1 }}>
                      <div style={{ alignItems: 'center', borderRadius: '8px', boxShadow: '#8D8A88 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                        <div style={{ boxSizing: 'border-box', color: '#E1DEDB', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                          Create new
                        </div>
                      </div>
                    </div>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flex: 1 }}>
                      <div style={{ alignItems: 'center', borderRadius: '8px', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                        <div style={{ boxSizing: 'border-box', color: '#E1DEDB', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                          Create new
                        </div>
                      </div>
                    </div>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flex: 1 }}>
                      <div style={{ alignItems: 'center', backgroundColor: '#D4744A2E', borderRadius: '8px', boxShadow: '#D4744A5C 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                        <div style={{ boxSizing: 'border-box', color: '#F6CEC2', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                          Delete
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ alignItems: 'center', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '8px' }}>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flex: 1, gap: 16 }}>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '2px', paddingRight: '16px', width: 'round(20%, 1px)' }}>
                      <div style={{ boxSizing: 'border-box', color: '#F6F3F0', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%' }}>
                        hover
                      </div>
                      <div style={{ boxSizing: 'border-box', color: '#B7B0A9', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '135%' }}>
                        primary and danger deepen their fill; ghost gains bg-elevated; secondary and outline firm the ring only
                      </div>
                    </div>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flex: 1 }}>
                      <div style={{ alignItems: 'center', backgroundColor: '#79B8D3', borderRadius: '8px', boxShadow: '#79B8D3 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                        <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                          Create new
                        </div>
                      </div>
                    </div>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flex: 1 }}>
                      <div style={{ alignItems: 'center', borderRadius: '8px', boxShadow: '#6F6C6A 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                        <div style={{ boxSizing: 'border-box', color: '#E1DEDB', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                          Create new
                        </div>
                      </div>
                    </div>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flex: 1 }}>
                      <div style={{ alignItems: 'center', borderRadius: '8px', boxShadow: '#B2AFAC 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                        <div style={{ boxSizing: 'border-box', color: '#E1DEDB', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                          Create new
                        </div>
                      </div>
                    </div>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flex: 1 }}>
                      <div style={{ alignItems: 'center', backgroundColor: '#3E3B38', borderRadius: '8px', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                        <div style={{ boxSizing: 'border-box', color: '#E1DEDB', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                          Create new
                        </div>
                      </div>
                    </div>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flex: 1 }}>
                      <div style={{ alignItems: 'center', backgroundColor: '#A9441F38', borderRadius: '8px', boxShadow: '#D4744A5C 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                        <div style={{ boxSizing: 'border-box', color: '#F6CEC2', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                          Delete
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ alignItems: 'center', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '8px' }}>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flex: 1, gap: 16 }}>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '2px', paddingRight: '16px', width: 'round(20%, 1px)' }}>
                      <div style={{ boxSizing: 'border-box', color: '#F6F3F0', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%' }}>
                        pressed
                      </div>
                      <div style={{ boxSizing: 'border-box', color: '#B7B0A9', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '135%' }}>
                        NO new fill. The ring goes to border-strong and the ink to text-primary; a press is already a hover, so hover's fill is what you see. danger has no pressed step of its own — it holds its hover tint
                      </div>
                    </div>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flex: 1 }}>
                      <div style={{ alignItems: 'center', backgroundColor: '#5799B1', borderRadius: '8px', boxShadow: '#5799B1 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                        <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                          Create new
                        </div>
                      </div>
                    </div>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flex: 1 }}>
                      <div style={{ alignItems: 'center', borderRadius: '8px', boxShadow: '#B2AFAC 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                        <div style={{ boxSizing: 'border-box', color: '#F6F3F0', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                          Create new
                        </div>
                      </div>
                    </div>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flex: 1 }}>
                      <div style={{ alignItems: 'center', borderRadius: '8px', boxShadow: '#B2AFAC 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                        <div style={{ boxSizing: 'border-box', color: '#F6F3F0', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                          Create new
                        </div>
                      </div>
                    </div>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flex: 1 }}>
                      <div style={{ alignItems: 'center', backgroundColor: '#3E3B38', borderRadius: '8px', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                        <div style={{ boxSizing: 'border-box', color: '#F6F3F0', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                          Create new
                        </div>
                      </div>
                    </div>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flex: 1 }}>
                      <div style={{ alignItems: 'center', backgroundColor: '#A9441F38', borderRadius: '8px', boxShadow: '#D4744A5C 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                        <div style={{ boxSizing: 'border-box', color: '#F6CEC2', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                          Delete
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ alignItems: 'start', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', width: 'fit-content' }}>
                  <div style={{ alignItems: 'center', alignSelf: 'stretch', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '8px' }}>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '2px', paddingRight: '16px', width: 'round(20%, 1px)' }}>
                      <div style={{ boxSizing: 'border-box', color: '#F6F3F0', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%' }}>
                        focus-visible
                      </div>
                      <div style={{ boxSizing: 'border-box', color: '#B7B0A9', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '135%' }}>
                        2px outline, offset 2px, border-focus. Outside the box and on its own layer — it survives forced-colors, a ring would not
                      </div>
                    </div>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flex: 1 }}>
                      <div style={{ alignItems: 'center', backgroundColor: '#9EDBF3', borderRadius: '8px', boxShadow: '#9EDBF3 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', outline: '2px solid #79B8D3', outlineOffset: '2px', paddingInline: '12px' }}>
                        <div style={{ boxSizing: 'border-box', color: '#1D1B19', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                          Create new
                        </div>
                      </div>
                    </div>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flex: 1 }}>
                      <div style={{ alignItems: 'center', borderRadius: '8px', boxShadow: '#F6F3F024 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', outline: '2px solid #79B8D3', outlineOffset: '2px', paddingInline: '12px' }}>
                        <div style={{ boxSizing: 'border-box', color: '#B7B0A9', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                          Create new
                        </div>
                      </div>
                    </div>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flex: 1 }}>
                      <div style={{ alignItems: 'center', borderRadius: '8px', boxShadow: '#8D8A88 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', outline: '2px solid #79B8D3', outlineOffset: '2px', paddingInline: '12px' }}>
                        <div style={{ boxSizing: 'border-box', color: '#E1DEDB', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                          Create new
                        </div>
                      </div>
                    </div>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flex: 1 }}>
                      <div style={{ alignItems: 'center', borderRadius: '8px', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', outline: '2px solid #79B8D3', outlineOffset: '2px', paddingInline: '12px' }}>
                        <div style={{ boxSizing: 'border-box', color: '#E1DEDB', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                          Create new
                        </div>
                      </div>
                    </div>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flex: 1 }}>
                      <div style={{ alignItems: 'center', backgroundColor: '#D4744A2E', borderRadius: '8px', boxShadow: '#D4744A5C 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', outline: '2px solid #79B8D3', outlineOffset: '2px', paddingInline: '12px' }}>
                        <div style={{ boxSizing: 'border-box', color: '#F6CEC2', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                          Delete
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ alignItems: 'center', borderTopColor: '#DAD4CE', borderTopStyle: 'solid', borderTopWidth: '1px', boxSizing: 'border-box', display: 'flex', gap: '16px', paddingBlock: '8px' }}>
                  <div style={{ alignItems: 'center', boxSizing: 'border-box', display: 'flex', flex: 1, gap: 16 }}>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '2px', paddingRight: '16px', width: 'round(20%, 1px)' }}>
                      <div style={{ boxSizing: 'border-box', color: '#F6F3F0', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, lineHeight: '100%' }}>
                        disabled
                      </div>
                      <div style={{ boxSizing: 'border-box', color: '#B7B0A9', display: 'inline-block', fontFamily: '"Aspekta-400", "Aspekta", system-ui, sans-serif', fontSize: '12px', lineHeight: '135%' }}>
                        bg-elevated, ring the same value so the control flattens, ink text-disabled. Identical across all five types
                      </div>
                    </div>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flex: 1 }}>
                      <div style={{ alignItems: 'center', backgroundColor: '#3E3B38', borderRadius: '8px', boxShadow: '#3E3B38 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                        <div style={{ boxSizing: 'border-box', color: '#817A73', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                          Create new
                        </div>
                      </div>
                    </div>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flex: 1 }}>
                      <div style={{ alignItems: 'center', backgroundColor: '#3E3B38', borderRadius: '8px', boxShadow: '#3E3B38 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                        <div style={{ boxSizing: 'border-box', color: '#817A73', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                          Create new
                        </div>
                      </div>
                    </div>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flex: 1 }}>
                      <div style={{ alignItems: 'center', backgroundColor: '#3E3B38', borderRadius: '8px', boxShadow: '#3E3B38 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                        <div style={{ boxSizing: 'border-box', color: '#817A73', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                          Create new
                        </div>
                      </div>
                    </div>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flex: 1 }}>
                      <div style={{ alignItems: 'center', backgroundColor: '#3E3B38', borderRadius: '8px', boxShadow: '#3E3B38 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                        <div style={{ boxSizing: 'border-box', color: '#817A73', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                          Create new
                        </div>
                      </div>
                    </div>
                    <div style={{ boxSizing: 'border-box', display: 'flex', flex: 1 }}>
                      <div style={{ alignItems: 'center', backgroundColor: '#3E3B38', borderRadius: '8px', boxShadow: '#3E3B38 0px 0px 0px 1.5px inset', boxSizing: 'border-box', display: 'flex', height: '32px', justifyContent: 'center', paddingInline: '12px' }}>
                        <div style={{ boxSizing: 'border-box', color: '#817A73', display: 'inline-block', fontFamily: '"Aspekta-600", "Aspekta", system-ui, sans-serif', fontSize: '12px', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: '100%' }}>
                          Delete
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div style={{ backgroundImage: 'linear-gradient(in oklab 180deg, #FEFEFE00 0%, #EBE6E0A3 100%)', bottom: 0, boxSizing: 'border-box', height: 'round(40%, 1px)', left: 0, position: 'absolute', width: '1600px' }} />
    </div>
  )
