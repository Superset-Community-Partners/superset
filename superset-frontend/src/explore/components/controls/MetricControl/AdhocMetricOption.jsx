/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { useCallback } from 'react';
import PropTypes from 'prop-types';
import { OptionControlLabel } from 'src/explore/components/controls/OptionControls';
import { DndItemType } from 'src/explore/components/DndItemType';
import columnType from './columnType';
import AdhocMetric from './AdhocMetric';
import savedMetricType from './savedMetricType';
import AdhocMetricPopoverTrigger from './AdhocMetricPopoverTrigger';

const propTypes = {
  adhocMetric: PropTypes.instanceOf(AdhocMetric),
  onMetricEdit: PropTypes.func.isRequired,
  onRemoveMetric: PropTypes.func,
  columns: PropTypes.arrayOf(columnType),
  savedMetricsOptions: PropTypes.arrayOf(savedMetricType),
  savedMetric: savedMetricType,
  datasource: PropTypes.object,
  onMoveLabel: PropTypes.func,
  onDropLabel: PropTypes.func,
  index: PropTypes.number,
  type: PropTypes.string,
  multi: PropTypes.bool,
  datasourceWarningMessage: PropTypes.string,
};

const AdhocMetricOption = (props) => {


    

    const onRemoveMetricHandler = useCallback((e) => {
    e?.stopPropagation();
    props.onRemoveMetric(props.index);
  }, []);

    const {
      adhocMetric,
      onMetricEdit,
      columns,
      savedMetricsOptions,
      savedMetric,
      datasource,
      onMoveLabel,
      onDropLabel,
      index,
      type,
      multi,
      datasourceWarningMessage,
    } = props;

    return (
      <AdhocMetricPopoverTrigger
        adhocMetric={adhocMetric}
        onMetricEdit={onMetricEdit}
        columns={columns}
        savedMetricsOptions={savedMetricsOptions}
        savedMetric={savedMetric}
        datasource={datasource}
      >
        <OptionControlLabel
          savedMetric={savedMetric}
          adhocMetric={adhocMetric}
          label={adhocMetric.label}
          onRemove={onRemoveMetricHandler}
          onMoveLabel={onMoveLabel}
          onDropLabel={onDropLabel}
          index={index}
          type={type ?? DndItemType.AdhocMetricOption}
          withCaret
          isFunction
          multi={multi}
          datasourceWarningMessage={datasourceWarningMessage}
        />
      </AdhocMetricPopoverTrigger>
    ); 
};




export default AdhocMetricOption;

AdhocMetricOption.propTypes = propTypes;
