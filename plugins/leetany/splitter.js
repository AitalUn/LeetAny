'use strict';

const MIN = 25, MAX = 75, DEFAULT = 50;

function addColumnSplitter(grid, initial, onCommit) {
  const handle = grid.createDiv({cls:'leetany-splitter', attr:{
    role:'separator', tabindex:'0', 'aria-label':'Description width',
    'aria-orientation':'vertical', 'aria-valuemin':String(MIN), 'aria-valuemax':String(MAX),
    title:'Drag to resize. Double-click to reset.'
  }});
  let share, drag;
  function set(value) {
    share = Math.max(MIN, Math.min(MAX, Math.round(value)));
    grid.style.setProperty('--leetany-description-width', share+'%');
    handle.setAttribute('aria-valuenow', String(share));
    handle.setAttribute('aria-valuetext', share+'%');
  }
  set(Number.isFinite(initial) ? initial : DEFAULT);
  function direction() {
    return grid.ownerDocument.defaultView.getComputedStyle(grid).direction === 'rtl' ? -1 : 1;
  }
  handle.onpointerdown = event => {
    if (drag || event.button !== 0) return;
    event.preventDefault();
    handle.focus({preventScroll:true});
    drag = {id:event.pointerId, x:event.clientX, share, direction:direction()};
    handle.setPointerCapture(event.pointerId);
    grid.addClass('leetany-resizing');
  };
  handle.onpointermove = event => {
    if (event.pointerId !== drag?.id) return;
    const width = grid.getBoundingClientRect().width;
    if (width) set(drag.share + drag.direction * (event.clientX - drag.x) * 100 / width);
  };
  handle.onlostpointercapture = event => {
    if (event.pointerId !== drag?.id) return;
    const changed = drag.share !== share;
    drag = null;
    grid.removeClass('leetany-resizing');
    if (changed) onCommit(share);
  };
  handle.ondblclick = () => { set(DEFAULT); onCommit(share); };
  handle.onkeydown = event => {
    const values = {ArrowLeft:share-2*direction(), ArrowRight:share+2*direction(), Home:MIN, End:MAX};
    if (!Object.hasOwn(values,event.key)) return;
    event.preventDefault();
    set(values[event.key]);
    onCommit(share);
  };
}

module.exports = {addColumnSplitter};
