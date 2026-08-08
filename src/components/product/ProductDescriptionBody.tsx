import {
  formatDescription,
  type DescriptionBlock,
} from "@/lib/format-description";

type Props = {
  text: string | null | undefined;
  className?: string;
};

function BlockView({ block }: { block: DescriptionBlock }) {
  if (block.type === "heading") {
    return <h3 className="product-panel__subtitle">{block.text}</h3>;
  }
  if (block.type === "list") {
    return (
      <ul className="product-panel__list">
        {block.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
  }
  return <p>{block.text}</p>;
}

/**
 * PDP description body — smart paragraph split + lists (level A UX).
 * Pure presentation; does not rewrite or store content.
 */
export function ProductDescriptionBody({ text, className }: Props) {
  const blocks = formatDescription(text);
  if (blocks.length === 0) return null;

  return (
    <div className={className ?? "product-panel__body"}>
      {blocks.map((block, i) => (
        <BlockView key={i} block={block} />
      ))}
    </div>
  );
}
