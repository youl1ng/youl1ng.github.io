import Media from './Media';
import CaseStudyShell, { Eyebrow, Section, rich } from './CaseStudyShell';
import { datpone as cs, datponeToc } from '@/content/case-studies/datpone';
import s from './CaseStudy.module.css';

/** DatPone case study: same layout, components and styles as 1Up (no page-specific CSS). */
export default function CaseStudyDatPone() {
  let shown = 0; // decisions with a visual alternate sides, starting with the image on the right
  return (
    <CaseStudyShell cs={cs} toc={datponeToc}>
      {/* 01 Problem */}
      <Section id={cs.problem.id} n={1} label="Problem" title={cs.problem.title}>
        <div className={s.body}>
          {cs.problem.body.map((p) => (
            <p key={p.slice(0, 24)}>{rich(p)}</p>
          ))}
        </div>
      </Section>

      {/* 02 Decisions */}
      <Section id={cs.decisions.id} n={2} label="Decisions" title={cs.decisions.title}>
        {cs.decisions.items.map((d, i) => {
          const flip = d.media ? shown++ % 2 === 1 : false;
          return (
            <div key={d.title} className={`${s.decision} ${flip ? s.decisionFlip : ''}`}>
              <div className={s.decisionText}>
                <Eyebrow>Decision {i + 1}</Eyebrow>
                <h3 className={s.h3}>{d.title}</h3>
                <p className={`${s.body} ${s.decisionBody}`}>{rich(d.body)}</p>
              </div>
              {d.media && <Media media={d.media} className={s.decisionMedia} />}
            </div>
          );
        })}
      </Section>

      {/* 03 Outcome: intro, the session recording, then the closing line */}
      <Section id={cs.outcome.id} n={3} label="Outcome" title={cs.outcome.title}>
        <div className={s.body}>
          {cs.outcome.body.map((p) => (
            <p key={p.slice(0, 24)}>{rich(p)}</p>
          ))}
        </div>
        <Media media={cs.outcome.media} className={s.mt36} />
        <div className={`${s.body} ${s.mt36}`}>
          <p>{rich(cs.outcome.closing)}</p>
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
    </CaseStudyShell>
  );
}
