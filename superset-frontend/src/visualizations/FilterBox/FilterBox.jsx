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

import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { debounce } from 'lodash';
import { max as d3Max } from 'd3-array';
import {
    AsyncCreatableSelect,
    CreatableSelect,
} from 'src/components/DeprecatedSelect';
import Button from 'src/components/Button';
import {
    css,
    styled,
    t,
    SupersetClient,
    ensureIsArray,
    withTheme,
} from '@superset-ui/core';
import { Global } from '@emotion/react';

import {
    BOOL_FALSE_DISPLAY,
    BOOL_TRUE_DISPLAY,
    SLOW_DEBOUNCE,
} from 'src/constants';
import { FormLabel } from 'src/components/Form';
import DateFilterControl from 'src/explore/components/controls/DateFilterControl';
import ControlRow from 'src/explore/components/ControlRow';
import Control from 'src/explore/components/Control';
import { controls } from 'src/explore/controls';
import { getExploreUrl } from 'src/explore/exploreUtils';
import OnPasteSelect from 'src/components/DeprecatedSelect/OnPasteSelect';
import {
    FILTER_CONFIG_ATTRIBUTES,
    FILTER_OPTIONS_LIMIT,
    TIME_FILTER_LABELS,
    TIME_FILTER_MAP,
} from 'src/explore/constants';

// a shortcut to a map key, used by many components
export const TIME_RANGE = TIME_FILTER_MAP.time_range;

const propTypes = {
  chartId: PropTypes.number.isRequired,
  origSelectedValues: PropTypes.object,
  datasource: PropTypes.object.isRequired,
  instantFiltering: PropTypes.bool,
  filtersFields: PropTypes.arrayOf(
    PropTypes.shape({
      field: PropTypes.string,
      label: PropTypes.string,
    }),
  ),
  filtersChoices: PropTypes.objectOf(
    PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        text: PropTypes.string,
        filter: PropTypes.string,
        metric: PropTypes.number,
      }),
    ),
  ),
  onChange: PropTypes.func,
  onFilterMenuOpen: PropTypes.func,
  onFilterMenuClose: PropTypes.func,
  showDateFilter: PropTypes.bool,
  showSqlaTimeGrain: PropTypes.bool,
  showSqlaTimeColumn: PropTypes.bool,
};
const defaultProps = {
  origSelectedValues: {},
  onChange: () => {},
  onFilterMenuOpen: () => {},
  onFilterMenuClose: () => {},
  showDateFilter: false,
  showSqlaTimeGrain: false,
  showSqlaTimeColumn: false,
  instantFiltering: false,
};

const StyledFilterContainer = styled.div`
  ${({ theme }) => `
    display: flex;
    flex-direction: column;
    margin-bottom: ${theme.gridUnit * 2 + 2}px;

    &:last-child {
      margin-bottom: 0;
    }

    label {
      display: flex;
      font-weight: ${theme.typography.weights.bold};
    }

    .filter-badge-container {
      width: 30px;
      padding-right: ${theme.gridUnit * 2 + 2}px;
    }

    .filter-badge-container + div {
      width: 100%;
    }
  `}
`;

/**
 * @deprecated in version 3.0.
 */
const FilterBox = (props) => {


    const [selectedValues, setSelectedValues] = useState(props.origSelectedValues);
    const [hasChanged, setHasChanged] = useState(false);

    const onFilterMenuOpenHandler = useCallback((column) => {
    return props.onFilterMenuOpen(props.chartId, column);
  }, []);
    const onFilterMenuCloseHandler = useCallback((column) => {
    return props.onFilterMenuClose(props.chartId, column);
  }, []);
    const onOpenDateFilterControlHandler = useCallback(() => {
    return onFilterMenuOpenHandler(TIME_RANGE);
  }, []);
    const onCloseDateFilterControlHandler = useCallback(() => onFilterMenuCloseHandler(TIME_RANGE), []);
    const getControlDataHandler = useCallback((controlName) => {
    
    const control = {
      ...controls[controlName], // TODO: make these controls ('granularity_sqla', 'time_grain_sqla') accessible from getControlsForVizType.
      name: controlName,
      key: `control-${controlName}`,
      value: selectedValues[TIME_FILTER_MAP[controlName]],
      actions: { setControlValue: changeFilterHandler },
    };
    const mapFunc = control.mapStateToProps;
    return mapFunc ? { ...control, ...mapFunc(props) } : control;
  }, [selectedValues]);
    /**
   * Get known max value of a column
   */
    const getKnownMaxHandler = useCallback((key, choices) => {
    maxValueCacheHandler[key] = Math.max(
      maxValueCacheHandler[key] || 0,
      d3Max(choices || props.filtersChoices[key] || [], x => x.metric),
    );
    return maxValueCacheHandler[key];
  }, []);
    const clickApplyHandler = useCallback(() => {
    
    setStateHandler({ hasChanged: false }, () => {
      props.onChange(selectedValues, false);
    });
  }, [selectedValues]);
    const changeFilterHandler = useCallback((filter, options) => {
    const fltr = TIME_FILTER_MAP[filter] || filter;
    let vals = null;
    if (options !== null) {
      if (Array.isArray(options)) {
        vals = options.map(opt => (typeof opt === 'string' ? opt : opt.value));
      } else if (Object.values(TIME_FILTER_MAP).includes(fltr)) {
        vals = options.value ?? options;
      } else {
        // must use array member for legacy extra_filters's value
        vals = ensureIsArray(options.value ?? options);
      }
    }

    setStateHandler(
      prevState => ({
        selectedValues: {
          ...prevState.selectedValues,
          [fltr]: vals,
        },
        hasChanged: true,
      }),
      () => {
        if (props.instantFiltering) {
          props.onChange({ [fltr]: vals }, false);
        }
      },
    );
  }, []);
    /**
   * Generate a debounce function that loads options for a specific column
   */
    const debounceLoadOptionsHandler = useCallback((key) => {
    if (!(key in debouncerCacheHandler)) {
      debouncerCacheHandler[key] = debounce((input, callback) => {
        loadOptionsHandler(key, input).then(callback);
      }, SLOW_DEBOUNCE);
    }
    return debouncerCacheHandler[key];
  }, []);
    /**
   * Transform select options, add bar background
   */
    const transformOptionsHandler = useCallback((options, max) => {
    const maxValue = max === undefined ? d3Max(options, x => x.metric) : max;
    return options.map(opt => {
      const perc = Math.round((opt.metric / maxValue) * 100);
      const color = 'lightgrey';
      const backgroundImage = `linear-gradient(to right, ${color}, ${color} ${perc}%, rgba(0,0,0,0) ${perc}%`;
      const style = { backgroundImage };
      let label = opt.id;
      if (label === true) {
        label = BOOL_TRUE_DISPLAY;
      } else if (label === false) {
        label = BOOL_FALSE_DISPLAY;
      }
      return { value: opt.id, label, style };
    });
  }, []);
    const loadOptionsHandler = useCallback(async (key, inputValue = '') => {
    const input = inputValue.toLowerCase();
    const sortAsc = props.filtersFields.find(x => x.key === key).asc;
    const formData = {
      ...props.rawFormData,
      adhoc_filters: inputValue
        ? [
            {
              clause: 'WHERE',
              expressionType: 'SIMPLE',
              subject: key,
              operator: 'ILIKE',
              comparator: `%${input}%`,
            },
          ]
        : null,
    };

    const { json } = await SupersetClient.get({
      url: getExploreUrl({
        formData,
        endpointType: 'json',
        method: 'GET',
      }),
    });
    const options = (json?.data?.[key] || []).filter(x => x.id);
    if (!options || options.length === 0) {
      return [];
    }
    if (input) {
      // sort those starts with search query to front
      options.sort((a, b) => {
        const labelA = a.id.toLowerCase();
        const labelB = b.id.toLowerCase();
        const textOrder = labelB.startsWith(input) - labelA.startsWith(input);
        return textOrder === 0
          ? (a.metric - b.metric) * (sortAsc ? 1 : -1)
          : textOrder;
      });
    }
    return transformOptionsHandler(options, getKnownMaxHandler(key, options));
  }, []);
    const renderDateFilterHandler = useCallback(() => {
    const { showDateFilter } = props;
    const label = TIME_FILTER_LABELS.time_range;
    if (showDateFilter) {
      return (
        <div className="row space-1">
          <div
            className="col-lg-12 col-xs-12"
            data-test="date-filter-container"
          >
            <DateFilterControl
              name={TIME_RANGE}
              label={label}
              description={t('Select start and end date')}
              onChange={newValue => {
                changeFilterHandler(TIME_RANGE, newValue);
              }}
              onOpenDateFilterControl={onOpenDateFilterControlHandler}
              onCloseDateFilterControl={onCloseDateFilterControlHandler}
              value={selectedValues[TIME_RANGE] || 'No filter'}
              endpoints={['inclusive', 'exclusive']}
            />
          </div>
        </div>
      );
    }
    return null;
  }, [selectedValues]);
    const renderDatasourceFiltersHandler = useCallback(() => {
    const { showSqlaTimeGrain, showSqlaTimeColumn } = props;
    const datasourceFilters = [];
    const sqlaFilters = [];
    if (showSqlaTimeGrain) sqlaFilters.push('time_grain_sqla');
    if (showSqlaTimeColumn) sqlaFilters.push('granularity_sqla');
    if (sqlaFilters.length) {
      datasourceFilters.push(
        <ControlRow
          key="sqla-filters"
          controls={sqlaFilters.map(control => (
            <Control {...getControlDataHandler(control)} />
          ))}
        />,
      );
    }
    return datasourceFilters;
  }, []);
    const renderSelectHandler = useCallback((filterConfig) => {
    const { filtersChoices } = props;
    
    debouncerCacheHandler = {};
    maxValueCacheHandler = {};

    // Add created options to filtersChoices, even though it doesn't exist,
    // or these options will exist in query sql but invisible to end user.
    Object.keys(selectedValues)
      .filter(key => key in filtersChoices)
      .forEach(key => {
        // empty values are ignored
        if (!selectedValues[key]) {
          return;
        }
        const choices = filtersChoices[key] || (filtersChoices[key] = []);
        const choiceIds = new Set(choices.map(f => f.id));
        const selectedValuesForKey = Array.isArray(selectedValues[key])
          ? selectedValues[key]
          : [selectedValues[key]];
        selectedValuesForKey
          .filter(value => value !== null && !choiceIds.has(value))
          .forEach(value => {
            choices.unshift({
              filter: key,
              id: value,
              text: value,
              metric: 0,
            });
          });
      });
    const {
      key,
      label,
      [FILTER_CONFIG_ATTRIBUTES.MULTIPLE]: isMultiple,
      [FILTER_CONFIG_ATTRIBUTES.DEFAULT_VALUE]: defaultValue,
      [FILTER_CONFIG_ATTRIBUTES.CLEARABLE]: isClearable,
      [FILTER_CONFIG_ATTRIBUTES.SEARCH_ALL_OPTIONS]: searchAllOptions,
    } = filterConfig;
    const data = filtersChoices[key] || [];
    let value = selectedValues[key] || null;

    // Assign default value if required
    if (value === undefined && defaultValue) {
      // multiple values are separated by semicolons
      value = isMultiple ? defaultValue.split(';') : defaultValue;
    }

    return (
      <OnPasteSelect
        cacheOptions
        loadOptions={debounceLoadOptionsHandler(key)}
        defaultOptions={transformOptionsHandler(data)}
        key={key}
        placeholder={t('Type or Select [%s]', label)}
        isMulti={isMultiple}
        isClearable={isClearable}
        value={value}
        options={transformOptionsHandler(data)}
        onChange={newValue => {
          // avoid excessive re-renders
          if (newValue !== value) {
            changeFilterHandler(key, newValue);
          }
        }}
        // TODO try putting this back once react-select is upgraded
        // onFocus={() => this.onFilterMenuOpen(key)}
        onMenuOpen={() => onFilterMenuOpenHandler(key)}
        onBlur={() => onFilterMenuCloseHandler(key)}
        onMenuClose={() => onFilterMenuCloseHandler(key)}
        selectWrap={
          searchAllOptions && data.length >= FILTER_OPTIONS_LIMIT
            ? AsyncCreatableSelect
            : CreatableSelect
        }
        noResultsText={t('No results found')}
        forceOverflow
      />
    );
  }, [selectedValues]);
    const renderFiltersHandler = useCallback(() => {
    const { filtersFields = [] } = props;
    return filtersFields.map(filterConfig => {
      const { label, key } = filterConfig;
      return (
        <StyledFilterContainer key={key} className="filter-container">
          <FormLabel htmlFor={`LABEL-${key}`}>{label}</FormLabel>
          {renderSelectHandler(filterConfig)}
        </StyledFilterContainer>
      );
    });
  }, []);

    const { instantFiltering, width, height } = props;
    const { zIndex, gridUnit } = props.theme;
    return (
      <>
        <Global
          styles={css`
            .dashboard .filter_box .slice_container > div:not(.alert) {
              padding-top: 0;
            }

            .filter_box {
              padding: ${gridUnit * 2 + 2}px 0;
              overflow: visible !important;

              &:hover {
                z-index: ${zIndex.max};
              }
            }
          `}
        />
        <div style={{ width, height, overflow: 'auto' }}>
          {renderDateFilterHandler()}
          {renderDatasourceFiltersHandler()}
          {renderFiltersHandler()}
          {!instantFiltering && (
            <Button
              buttonSize="small"
              buttonStyle="primary"
              onClick={clickApplyHandler.bind(this)}
              disabled={!hasChanged}
            >
              {t('Apply')}
            </Button>
          )}
        </div>
      </>
    ); 
};




FilterBox.propTypes = propTypes;
FilterBox.defaultProps = defaultProps;

export default withTheme(FilterBox);
