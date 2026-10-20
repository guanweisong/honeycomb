import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { FieldControl } from "./FieldControl";

it("does not display an object as a text field value", () => {
  const html = renderToStaticMarkup(
    <FieldControl
      field={{ name: "name", type: "text" }}
      name="name"
      formValues={{}}
      controllerField={{
        name: "name",
        value: { broken: true },
        onChange: () => {},
        onBlur: () => {},
        ref: () => {},
      }}
    />,
  );
  expect(html).toContain('value=""');
  expect(html).not.toContain("[object Object]");
});

it("renders an invalid calendar value as an empty control", () => {
  const html = renderToStaticMarkup(
    <FieldControl
      field={{ name: "date", type: "calendar" }}
      name="date"
      formValues={{}}
      controllerField={{
        name: "date",
        value: "not-a-date",
        onChange: () => {},
        onBlur: () => {},
        ref: () => {},
      }}
    />,
  );
  expect(html).toContain('value=""');
});
