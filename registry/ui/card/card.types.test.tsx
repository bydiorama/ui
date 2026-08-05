/** Compile-time contract tests. `tsc --noEmit` is the runner. */
import { Card } from "./card.tsx";

export function Valid() {
  return (
    <>
      <Card><Card.Header>Section options</Card.Header></Card>
      <Card className="max-w-lg" aria-labelledby="x">
        <Card.Header headingLevel={2} actions={<button type="button">Edit</button>}>
          Section options
        </Card.Header>
        <div>Boxed content</div>
        <Card.Footer><button type="button">Cancel</button></Card.Footer>
      </Card>
    </>
  );
}

export function Invalid() {
  /* @ts-expect-error children is required — a card with no content is a box */
  const a = <Card />;
  /* @ts-expect-error a header needs a title */
  const b = <Card><Card.Header /></Card>;
  /* @ts-expect-error 1 is not an allowed heading level — h1 belongs to the page */
  const c = <Card><Card.Header headingLevel={1}>T</Card.Header></Card>;
  /* @ts-expect-error 7 is not a heading level */
  const d = <Card><Card.Header headingLevel={7}>T</Card.Header></Card>;
  return [a, b, c, d];
}
