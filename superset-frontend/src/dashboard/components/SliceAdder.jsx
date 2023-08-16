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
/* eslint-env browser */

import { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { List } from 'react-virtualized';
import { createFilter } from 'react-search-input';
import {
    t,
    styled,
    isFeatureEnabled,
    FeatureFlag,
    css
} from '@superset-ui/core';
import { Input } from 'src/components/Input';
import { Select } from 'src/components';
import Loading from 'src/components/Loading';
import Button from 'src/components/Button';
import Icons from 'src/components/Icons';
import {
    CHART_TYPE,
    NEW_COMPONENT_SOURCE_TYPE
} from 'src/dashboard/util/componentTypes';
import {
    NEW_CHART_ID,
    NEW_COMPONENTS_SOURCE_ID
} from 'src/dashboard/util/constants';
import { slicePropShape } from 'src/dashboard/util/propShapes';
import { FILTER_BOX_MIGRATION_STATES } from 'src/explore/constants';
import _ from 'lodash';
import AddSliceCard from './AddSliceCard';
import AddSliceDragPreview from './dnd/AddSliceDragPreview';
import DragDroppable from './dnd/DragDroppable';

const propTypes = {
  fetchAllSlices: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  slices: PropTypes.objectOf(slicePropShape).isRequired,
  lastUpdated: PropTypes.number.isRequired,
  errorMessage: PropTypes.string,
  userId: PropTypes.string.isRequired,
  selectedSliceIds: PropTypes.arrayOf(PropTypes.number),
  editMode: PropTypes.bool,
  height: PropTypes.number,
  filterboxMigrationState: FILTER_BOX_MIGRATION_STATES,
  dashboardId: PropTypes.number
};

const defaultProps = {
  selectedSliceIds: [],
  editMode: false,
  errorMessage: '',
  height: window.innerHeight,
  filterboxMigrationState: FILTER_BOX_MIGRATION_STATES.NOOP
};

const KEYS_TO_FILTERS = ['slice_name', 'viz_type', 'datasource_name'];
const KEYS_TO_SORT = {
  slice_name: 'name',
  viz_type: 'viz type',
  datasource_name: 'dataset',
  changed_on: 'recent'
};

const DEFAULT_SORT_KEY = 'changed_on';

const MARGIN_BOTTOM = 16;
const SIDEPANE_HEADER_HEIGHT = 30;
const SLICE_ADDER_CONTROL_HEIGHT = 64;
const DEFAULT_CELL_HEIGHT = 128;

const Controls = styled.div`
  display: flex;
  flex-direction: row;
  padding: ${({ theme }) => theme.gridUnit * 3}px;
  padding-top: ${({ theme }) => theme.gridUnit * 4}px;
`;

const StyledSelect = styled(Select)`
  margin-left: ${({ theme }) => theme.gridUnit * 2}px;
  min-width: 150px;
`;

const NewChartButtonContainer = styled.div`
  ${({ theme }) => css`
    display: flex;
    justify-content: flex-end;
    padding-right: ${theme.gridUnit * 2}px;
  `}
`;

const NewChartButton = styled(Button)`
  ${({ theme }) => css`
    height: auto;
    & > .anticon + span {
      margin-left: 0;
    }
    & > [role='img']:first-of-type {
      margin-right: ${theme.gridUnit}px;
      padding-bottom: 1px;
      line-height: 0;
    }
  `}
`;

const SliceAdder = (props) => {


    const [filteredSlices, setFilteredSlices] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState(DEFAULT_SORT_KEY);
    const [selectedSliceIdsSet, setSelectedSliceIdsSet] = useState(new Set(props.selectedSliceIds));

    useEffect(() => {
    const { userId, filterboxMigrationState } = props;
    slicesRequestHandler = props.fetchAllSlices(
      userId,
      isFeatureEnabled(FeatureFlag.ENABLE_FILTER_BOX_MIGRATION) &&
        filterboxMigrationState !== FILTER_BOX_MIGRATION_STATES.SNOOZED
    );
  }, []);
    const UNSAFE_componentWillReceivePropsHandler = useCallback((nextProps) => {
    const nextState = {};
    if (nextProps.lastUpdated !== props.lastUpdated) {
      nextState.filteredSlices = Object.values(nextProps.slices)
        .filter(createFilter(searchTerm, KEYS_TO_FILTERS))
        .sort(SliceAdder.sortByComparator(sortBy));
    }

    if (nextProps.selectedSliceIds !== props.selectedSliceIds) {
      nextState.selectedSliceIdsSet = new Set(nextProps.selectedSliceIds);
    }

    if (Object.keys(nextState).length) {
      setStateHandler(nextState);
    }
  }, [searchTerm, sortBy]);
    useEffect(() => {
    return () => {
    if (slicesRequestHandler && slicesRequestHandler.abort) {
      slicesRequestHandler.abort();
    }
  };
}, []);
    const getFilteredSortedSlicesHandler = useCallback((searchTerm, sortBy) => {
    return Object.values(props.slices)
      .filter(createFilter(searchTerm, KEYS_TO_FILTERS))
      .sort(SliceAdder.sortByComparator(sortBy));
  }, [searchTerm, sortBy]);
    const handleKeyPressHandler = useCallback((ev) => {
    if (ev.key === 'Enter') {
      ev.preventDefault();

      searchUpdatedHandler(ev.target.value);
    }
  }, []);
    const handleChange = useRef(_.debounce(value => {
    searchUpdatedHandler(value);

    const { userId, filterboxMigrationState } = props;
    slicesRequestHandler = props.fetchFilteredSlices(
      userId,
      isFeatureEnabled(FeatureFlag.ENABLE_FILTER_BOX_MIGRATION) &&
        filterboxMigrationState !== FILTER_BOX_MIGRATION_STATES.SNOOZED,
      value
    );
  }, 300));
    const searchUpdatedHandler = useCallback((searchTerm) => {
    setSearchTerm(searchTerm);
    setFilteredSlices(getFilteredSortedSlicesHandler(
        searchTerm,
        prevState.sortBy
      ));
  }, [searchTerm]);
    const handleSelectHandler = useCallback((sortBy) => {
    setSortBy(sortBy);
    setFilteredSlices(getFilteredSortedSlicesHandler(
        prevState.searchTerm,
        sortBy
      ));

    const { userId, filterboxMigrationState } = props;
    slicesRequestHandler = props.fetchSortedSlices(
      userId,
      isFeatureEnabled(FeatureFlag.ENABLE_FILTER_BOX_MIGRATION) &&
        filterboxMigrationState !== FILTER_BOX_MIGRATION_STATES.SNOOZED,
      sortBy
    );
  }, [sortBy]);
    const rowRendererHandler = useCallback(({ key, index, style }) => {
    
    const cellData = filteredSlices[index];
    const isSelected = selectedSliceIdsSet.has(cellData.slice_id);
    const type = CHART_TYPE;
    const id = NEW_CHART_ID;

    const meta = {
      chartId: cellData.slice_id,
      sliceName: cellData.slice_name
    };
    return (
      <DragDroppable
        key={key}
        component={{ type, id, meta }}
        parentComponent={{
          id: NEW_COMPONENTS_SOURCE_ID,
          type: NEW_COMPONENT_SOURCE_TYPE
        }}
        index={index}
        depth={0}
        disableDragDrop={isSelected}
        editMode={props.editMode}
        // we must use a custom drag preview within the List because
        // it does not seem to work within a fixed-position container
        useEmptyDragPreview
        // List library expect style props here
        // actual style should be applied to nested AddSliceCard component
        style={{}}
      >
        {({ dragSourceRef }) => (
          <AddSliceCard
            innerRef={dragSourceRef}
            style={style}
            sliceName={cellData.slice_name}
            lastModified={cellData.changed_on_humanized}
            visType={cellData.viz_type}
            datasourceUrl={cellData.datasource_url}
            datasourceName={cellData.datasource_name}
            thumbnailUrl={cellData.thumbnail_url}
            isSelected={isSelected}
          />
        )}
      </DragDroppable>
    );
  }, [filteredSlices, selectedSliceIdsSet]);

    const slicesListHeight =
      props.height -
      SIDEPANE_HEADER_HEIGHT -
      SLICE_ADDER_CONTROL_HEIGHT -
      MARGIN_BOTTOM;
    return (
      <div className="slice-adder-container">
        <NewChartButtonContainer>
          <NewChartButton
            buttonStyle="link"
            buttonSize="xsmall"
            onClick={() =>
              window.open(
                `/chart/add?dashboard_id=${props.dashboardId}`,
                '_blank',
                'noopener noreferrer'
              )
            }
          >
            <Icons.PlusSmall />
            {t('Create new chart')}
          </NewChartButton>
        </NewChartButtonContainer>
        <Controls>
          <Input
            placeholder={t('Filter your charts')}
            className="search-input"
            onChange={ev => handleChange.current(ev.target.value)}
            onKeyPress={handleKeyPressHandler}
            data-test="dashboard-charts-filter-search-input"
          />
          <StyledSelect
            id="slice-adder-sortby"
            value={sortBy}
            onChange={handleSelectHandler}
            options={Object.entries(KEYS_TO_SORT).map(([key, label]) => ({
              label: t('Sort by %s', label),
              value: key
            }))}
            placeholder={t('Sort by')}
          />
        </Controls>
        {props.isLoading && <Loading />}
        {!props.isLoading && filteredSlices.length > 0 && (
          <List
            width={376}
            height={slicesListHeight}
            rowCount={filteredSlices.length}
            rowHeight={DEFAULT_CELL_HEIGHT}
            rowRenderer={rowRendererHandler}
            searchTerm={searchTerm}
            sortBy={sortBy}
            selectedSliceIds={props.selectedSliceIds}
          />
        )}
        {props.errorMessage && (
          <div className="error-message">{props.errorMessage}</div>
        )}
        {/* Drag preview is just a single fixed-position element */}
        <AddSliceDragPreview slices={filteredSlices} />
      </div>
    ); 
};

SliceAdder.sortByComparator = (attr) => {
    const desc = attr === 'changed_on' ? -1 : 1;

    return (a, b) => {
      if (a[attr] < b[attr]) {
        return -1 * desc;
      }
      if (a[attr] > b[attr]) {
        return 1 * desc;
      }
      return 0;
    };
  };


SliceAdder.propTypes = propTypes;
SliceAdder.defaultProps = defaultProps;

export default SliceAdder;
