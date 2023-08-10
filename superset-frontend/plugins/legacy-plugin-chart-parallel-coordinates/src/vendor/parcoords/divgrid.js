/* [LICENSE TBD] */
/* eslint-disable */
// from http://bl.ocks.org/3687826
export default (config) => {
  var columns = [];

  var dg = (selection) => {
  if (columns.length == 0) columns = d3.keys(selection.data()[0][0]);

    // header
    selection
      .selectAll('.header')
      .data([true])
      .enter()
      .append('div')
      .attr('class', 'header');

    var header = selection.select('.header').selectAll('.cell').data(columns);

    header
      .enter()
      .append('div')
      .attr('class', (d, i) => {
  return 'col-' + i;
})
      .classed('cell', true);

    selection.selectAll('.header .cell').text((d) => {
  return d;
});

    header.exit().remove();

    // rows
    var rows = selection.selectAll('.row').data((d) => {
  return d;
});

    rows.enter().append('div').attr('class', 'row');

    rows.exit().remove();

    var cells = selection
      .selectAll('.row')
      .selectAll('.cell')
      .data((d) => {
  return columns.map((col) => {
  return d[col];
});
});

    // cells
    cells
      .enter()
      .append('div')
      .attr('class', (d, i) => {
  return 'col-' + i;
})
      .classed('cell', true);

    cells.exit().remove();

    selection.selectAll('.cell').text((d) => {
  return d;
});

    return dg;
};

  dg.columns = function (_) {
    if (!arguments.length) return columns;
    columns = _;
    return this;
  };

  return dg;
}
