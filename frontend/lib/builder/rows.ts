/**
 * The blocks of a page that count as numbered "rows" while writing (Marjinalya's gutter and the caret
 * position both use it). Keep in sync with app/studio-canvas.css, which cannot import this list.
 */
export const editRowSelector = '[data-edit-field="title"], [data-edit-field="excerpt"], [data-edit-field^="paragraph-"], [data-edit-field="figure"], [data-edit-field="code"], [data-edit-field="table"]';
