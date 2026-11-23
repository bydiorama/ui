import { Card } from "@/ui/card";
import { Badge } from "@/ui/badge";

export function Example() {
  return (
    <Card collapsible>
      <Card.Header headingLevel={3} subtitle="Updated just now">
        Brand guidelines
      </Card.Header>
      <Card.Body>
        <p>Colours, type and spacing for your next project.</p>
      </Card.Body>
      <Card.Footer>
        <Badge variant="success">Ready for review</Badge>
      </Card.Footer>
    </Card>
  );
}
