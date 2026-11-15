import { describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import ResultView from '@/components/result-view.vue';
import { makeConfig, makeResult } from '@/test-fixtures';

// The score chart loads chart.js lazily; happy-dom has no canvas support,
// so the chart modules are replaced with inert stand-ins. `__esModule: true`
// makes Vue's defineAsyncComponent unwrap `.default` from the mocked module.
vi.mock('primevue/chart', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    __esModule: true,
    default: defineComponent({
      name: 'Chart',
      setup: () => () => h('div', { 'data-testid': 'chart-stub' }),
    }),
  };
});

vi.mock('chart.js', () => ({
  Chart: { register: (): void => undefined },
}));

vi.mock('chartjs-plugin-annotation', () => ({
  default: {},
}));

describe('result-view', () => {
  it('lädt das LÜ-LIX-Diagramm nach dem Mount nach', async () => {
    const wrapper = mount(ResultView, { props: { result: makeResult() } });
    // Das Diagramm ist eine async Komponente: erst nach dem dynamischen Import da.
    await flushPromises();

    expect(wrapper.find('[data-testid="chart-stub"]').exists()).toBe(true);
  });

  it('zeigt den erkannten Titel mit der Beschriftung "Titel" an', async () => {
    const wrapper = mount(ResultView, {
      props: { result: makeResult({ title: 'Der Igel' }) },
    });

    expect(wrapper.text()).toContain('Der Igel');
    expect(wrapper.text()).toContain('Titel');
    expect(wrapper.text()).toContain('fließt in keine Kennzahl ein');
  });

  it('rendert nichts Titelbezogenes, wenn kein Titel erkannt wurde', async () => {
    const wrapper = mount(ResultView, {
      props: { result: makeResult({ title: '' }) },
    });

    expect(wrapper.html()).not.toContain('Titel');
  });

  it('zeigt Niveaustufe, LÜ-LIX, LIX, WK und Umfang an (AC5)', async () => {
    const wrapper = mount(ResultView, {
      props: { result: makeResult() },
    });

    const text = wrapper.text();
    expect(text).toContain('Niveaustufe 2');
    expect(text).toContain('LÜ-LIX');
    expect(text).toContain('37'); // LÜ-LIX-Wert
    expect(text).toContain('LIX');
    expect(text).toContain('29.5'); // LIX-Wert
    expect(text).toContain('WK');
    expect(text).toContain('25'); // Wortkomplexität
    expect(text).toContain('Umfang');
    expect(text).toContain('Wörter');
    expect(text).toContain('8'); // Umfang = Wortzahl
  });

  it('leitet die Niveaustufe ausschließlich aus dem Backend-Wert ab (keine eigene Stufen-Logik)', async () => {
    // Hoher LÜ-LIX, aber das Backend meldet Stufe 1 — die Oberfläche folgt dem Backend.
    const wrapper = mount(ResultView, {
      props: { result: makeResult({ lueLix: 90, level: 1 }) },
    });
    expect(wrapper.text()).toContain('Niveaustufe 1');
    expect(wrapper.text()).toContain('Sehr leicht lesbar');

    const harder = mount(ResultView, {
      props: { result: makeResult({ level: 4 }) },
    });
    expect(harder.text()).toContain('Niveaustufe 4');
    expect(harder.text()).toContain('Eher schwer lesbar');
  });

  it('ordnet in der Gewichtungsanzeige jeder WK-Komponente ihren eigenen Gewichtswert zu', async () => {
    // Bewusst unterschiedliche Gewichte, damit eine vertauschte Label-Wert-
    // Zuordnung auffällt. PrimeVue MeterGroup rendert je Eintrag "<Label> (<%>)".
    const wrapper = mount(ResultView, {
      props: {
        result: makeResult({
          config: makeConfig({
            weightComplexSyllables: 50,
            weightMultiMemberedGraphemes: 20,
            weightRareGraphemes: 15,
            weightConsonantClusters: 10,
          }),
        }),
      },
    });

    const text = wrapper.text();
    expect(text).toContain('Drei- und Mehrsilber (50%)');
    expect(text).toContain('Mehrgliedrige Grapheme (20%)');
    expect(text).toContain('Seltene Grapheme (15%)');
    expect(text).toContain('Konsonantenlauthäufung (10%)');
    // Der LIX trägt kein eigenes Gewicht mehr (LÜ-LIX = LIX + α·WK).
    expect(text).not.toContain('Lesbarkeitsindex (LIX) (');
  });

  it('nennt den LIX bei Fließtext „LIX nach Bamberger" und kennzeichnet die Leseeinheit Satz (AC4)', async () => {
    const wrapper = mount(ResultView, {
      props: {
        result: makeResult({ textType: 'prose', readingUnit: 'sentence' }),
      },
    });

    const text = wrapper.text();
    expect(text).toContain('LIX nach Bamberger');
    expect(text).toContain('Fließtext');
    expect(text).toContain('Leseeinheit');
    expect(text).toContain('Satz');
  });

  it('nennt den LIX bei Liste NICHT „nach Bamberger" und kennzeichnet die Leseeinheit Zeile (AC4)', async () => {
    const wrapper = mount(ResultView, {
      props: {
        result: makeResult({
          textType: 'list',
          readingUnit: 'line',
          countReadingUnits: 4,
        }),
      },
    });

    const text = wrapper.text();
    expect(text).not.toContain('LIX nach Bamberger');
    expect(text).toContain('Liste');
    expect(text).toContain('Zeile');
  });

  it('zeigt im Umfang die Anzahl Leseeinheiten passend zum Texttyp an (AC6)', async () => {
    const prose = mount(ResultView, {
      props: { result: makeResult({ textType: 'prose', readingUnit: 'sentence' }) },
    });
    expect(prose.text()).toContain('Sätze');

    const list = mount(ResultView, {
      props: {
        result: makeResult({
          textType: 'list',
          readingUnit: 'line',
          countReadingUnits: 4,
        }),
      },
    });
    expect(list.text()).toContain('Zeilen');
  });

  it('verwendet die verbindlichen Glossar-Begriffe statt der alten Begriffe', async () => {
    const wrapper = mount(ResultView, {
      props: { result: makeResult() },
    });

    const text = wrapper.text();
    expect(text).toContain('Drei- und Mehrsilber');
    expect(text).toContain('Konsonantenlauthäufung');
    expect(text).toContain('Mehrgliedrige Grapheme');
    expect(text).toContain('Seltene Grapheme');

    expect(text).not.toContain('Komplexe Silben');
    expect(text).not.toContain('Schwierige Buchstabenfolgen');
    expect(text).not.toContain('Mehrteilige Buchstabengruppen');
    expect(text).not.toContain('Seltene Buchstaben');
  });
});
