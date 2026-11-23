import Media from './Media';
import CaseStudyShell, { Eyebrow, Section } from './CaseStudyShell';
import { caseStudy as cs, caseStudyToc } from '@/content/case-studies/1up';
import s from './CaseStudy.module.css';

/** 1Up case study (layout from 1up-case-study-wireframe.html). Nav, hero, intro, TL;DR and footer live in CaseStudyShell. */
export default function CaseStudy1Up() {
  return (
    <CaseStudyShell cs={cs} toc={caseStudyToc}>
      {/* 01 Problem */}
      <Section id={cs.problem.id} n={1} label="Problem" title={cs.problem.title}>
        <div className={s.body}>
          {cs.problem.body.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>
      </Section>

      {/* 02 Decisions: text and image alternate sides */}
      <Section id={cs.decisions.id} n={2} label="Decisions" title={cs.decisions.title}>
        {cs.decisions.items.map((d, i) => (
          <div key={d.title} className={`${s.decision} ${i % 2 ? s.decisionFlip : ''}`}>
            <div className={s.decisionText}>
              <Eyebrow>Decision {i + 1}</Eyebrow>
              <h3 className={s.h3}>{d.title}</h3>
              <p className={`${s.body} ${s.decisionBody}`}>{d.body}</p>
            </div>
            {'extra' in d && d.extra ? (
              // two screens side by side, each the same size as a single one, with one caption centered under both
              <div className={s.decisionMedia}>
                <div className={s.mediaPair}>
                  <div style={{ width: `${(d.media.scale ?? 1) * 100}%` }}>
                    <Media media={{ ...d.media, scale: undefined, caption: undefined }} />
                  </div>
                  <div style={{ width: `${(d.extra.scale ?? 1) * 100}%` }}>
                    <Media media={{ ...d.extra, scale: undefined, caption: undefined }} />
                  </div>
                </div>
                {d.media.caption && <p className={s.cap}>{d.media.caption}</p>}
              </div>
            ) : (
              <Media media={d.media} className={s.decisionMedia} />
            )}
          </div>
        ))}
      </Section>

      {/* 03 Outcome */}
      <Section id={cs.outcome.id} n={3} label="Outcome" title={cs.outcome.title}>
        <div className={s.tabs}>
          {cs.outcome.tabs.map((t) => (
            <div key={t.name}>
              <Media media={{ aspect: '406 / 864', ...t.media }} />
              <h3 className={s.tabName}>{t.name}</h3>
              <p className={s.tabText}>{t.text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 04 Reflection */}
      <Section id={cs.reflection.id} n={4} label="Reflection" title={cs.reflection.title}>
        <div className={s.refl}>
          {cs.reflection.items.map((r) => (
            <p key={r.lead}>
              <b>{r.lead}</b> {r.text}
            </p>
          ))}
        </div>
      </Section>

      {/* 05 Next: roadmap cards */}
      <Section id={cs.next.id} n={5} label="Next" title={cs.next.title}>
        <p className={`${s.body} ${s.nextIntro}`}>{cs.next.intro}</p>
        <ul className={s.road}>
          {cs.next.items.map((it, i) => (
            <li key={it.title} className={s.roadItem}>
              <span className={s.roadN}>{String(i + 1).padStart(2, '0')}</span>
              <h3 className={s.roadTitle}>{it.title}</h3>
              <p className={s.roadText}>{it.text}</p>
            </li>
          ))}
        </ul>
      </Section>
    </CaseStudyShell>
  );
}
