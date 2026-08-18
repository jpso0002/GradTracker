Underline tabs for switching views inside a screen (never for top-level navigation — that's the sidebar).

```jsx
<Tabs activeId="all" onSelect={setTab} tabs={[
  { id: "all", label: "All", count: 23 }, { id: "active", label: "Active", count: 11 },
]} />
```
