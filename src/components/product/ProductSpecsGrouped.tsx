import type { SpecSection } from "@/lib/product-specs";

type Props = {
  sections: SpecSection[];
  /** Localized titles keyed by section id */
  titles: Record<string, string>;
  /** Outer panel title, e.g. «Характеристики» */
  heading: string;
};

export function ProductSpecsGrouped({ sections, titles, heading }: Props) {
  if (!sections.length) return null;

  return (
    <section className="product-panel">
      <h2 className="product-panel__title">{heading}</h2>
      <div className="product-specs-groups">
        {sections.map((section) => (
          <div key={section.id} className="product-specs-section">
            <h3 className="product-specs-section__title">
              {titles[section.id] || section.id}
            </h3>
            <table className="product-panel__specs">
              <tbody>
                {section.rows.map((row, i) => (
                  <tr key={`${section.id}-${row.key}-${i}`}>
                    <th scope="row">{row.label}</th>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </section>
  );
}
