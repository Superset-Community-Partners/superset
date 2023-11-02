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

import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { List } from 'src/components';
import { connect } from 'react-redux';
import { t, withTheme } from '@superset-ui/core';
import { InfoTooltipWithTrigger } from '@superset-ui/chart-controls';
import AsyncEsmComponent from 'src/components/AsyncEsmComponent';
import { getChartKey } from 'src/explore/exploreUtils';
import { runAnnotationQuery } from 'src/components/Chart/chartAction';
import CustomListItem from 'src/explore/components/controls/CustomListItem';
import ControlPopover, {
    getSectionContainerElement,
} from '../ControlPopover/ControlPopover';

const AnnotationLayer = AsyncEsmComponent(
  () => import('./AnnotationLayer'),
  // size of overlay inner content
  () => <div style={{ width: 450, height: 368 }} />,
);

const propTypes = {
  colorScheme: PropTypes.string.isRequired,
  annotationError: PropTypes.object,
  annotationQuery: PropTypes.object,
  vizType: PropTypes.string,

  validationErrors: PropTypes.array,
  name: PropTypes.string.isRequired,
  actions: PropTypes.object,
  value: PropTypes.arrayOf(PropTypes.object),
  onChange: PropTypes.func,
  refreshAnnotationData: PropTypes.func,
};

const defaultProps = {
  vizType: '',
  value: [],
  annotationError: {},
  annotationQuery: {},
  onChange: () => {},
};

const AnnotationLayerControl = (props) => {


    const [popoverVisible, setPopoverVisible] = useState({});
    const [addedAnnotationIndex, setAddedAnnotationIndex] = useState(null);

    useEffect(() => {
    // preload the AnnotationLayer component and dependent libraries i.e. mathjs
    AnnotationLayer.preload();
  }, []);
    const UNSAFE_componentWillReceivePropsHandler = useCallback((nextProps) => {
    const { name, annotationError, validationErrors, value } = nextProps;
    if (Object.keys(annotationError).length && !validationErrors.length) {
      props.actions.setControlValue(
        name,
        value,
        Object.keys(annotationError),
      );
    }
    if (!Object.keys(annotationError).length && validationErrors.length) {
      props.actions.setControlValue(name, value, []);
    }
  }, []);
    const addAnnotationLayerHandler = useCallback((originalAnnotation, newAnnotation) => {
    let annotations = props.value;
    if (annotations.includes(originalAnnotation)) {
      annotations = annotations.map(anno =>
        anno === originalAnnotation ? newAnnotation : anno,
      );
    } else {
      annotations = [...annotations, newAnnotation];
      setAddedAnnotationIndex(annotations.length - 1);
    }

    props.refreshAnnotationData({
      annotation: newAnnotation,
      force: true,
    });

    props.onChange(annotations);
  }, []);
    const handleVisibleChangeHandler = useCallback((visible, popoverKey) => {
    setStateHandler(prevState => ({
      popoverVisible: { ...prevState.popoverVisible, [popoverKey]: visible },
    }));
  }, []);
    const removeAnnotationLayerHandler = useCallback((annotation) => {
    const annotations = props.value.filter(anno => anno !== annotation);
    // So scrollbar doesnt get stuck on hidden
    const element = getSectionContainerElement();
    if (element) {
      element.style.setProperty('overflow-y', 'auto', 'important');
    }
    props.onChange(annotations);
  }, []);
    const renderPopoverHandler = useCallback((popoverKey, annotation, error) => {
    const id = annotation?.name || '_new';

    return (
      <div id={`annotation-pop-${id}`} data-test="popover-content">
        <AnnotationLayer
          {...annotation}
          error={error}
          colorScheme={props.colorScheme}
          vizType={props.vizType}
          addAnnotationLayer={newAnnotation =>
            addAnnotationLayerHandler(annotation, newAnnotation)
          }
          removeAnnotationLayer={() => removeAnnotationLayerHandler(annotation)}
          close={() => {
            handleVisibleChangeHandler(false, popoverKey);
            setAddedAnnotationIndex(null);
          }}
        />
      </div>
    );
  }, []);
    const renderInfoHandler = useCallback((anno) => {
    const { annotationError, annotationQuery, theme } = props;
    if (annotationQuery[anno.name]) {
      return (
        <i
          className="fa fa-refresh"
          style={{ color: theme.colors.primary.base }}
          aria-hidden
        />
      );
    }
    if (annotationError[anno.name]) {
      return (
        <InfoTooltipWithTrigger
          label="validation-errors"
          bsStyle="danger"
          tooltip={annotationError[anno.name]}
        />
      );
    }
    if (!anno.show) {
      return <span style={{ color: theme.colors.error.base }}> Hidden </span>;
    }
    return '';
  }, []);

    
    const addedAnnotation = props.value[addedAnnotationIndex];

    const annotations = props.value.map((anno, i) => (
      <ControlPopover
        key={i}
        trigger="click"
        title={t('Edit annotation layer')}
        css={theme => ({
          '&:hover': {
            cursor: 'pointer',
            backgroundColor: theme.colors.grayscale.light4,
          },
        })}
        content={renderPopoverHandler(
          i,
          anno,
          props.annotationError[anno.name],
        )}
        visible={popoverVisible[i]}
        onVisibleChange={visible => handleVisibleChangeHandler(visible, i)}
      >
        <CustomListItem selectable>
          <span>{anno.name}</span>
          <span style={{ float: 'right' }}>{renderInfoHandler(anno)}</span>
        </CustomListItem>
      </ControlPopover>
    ));

    const addLayerPopoverKey = 'add';
    return (
      <div>
        <List bordered css={theme => ({ borderRadius: theme.gridUnit })}>
          {annotations}
          <ControlPopover
            trigger="click"
            content={renderPopoverHandler(addLayerPopoverKey, addedAnnotation)}
            title={t('Add annotation layer')}
            visible={popoverVisible[addLayerPopoverKey]}
            destroyTooltipOnHide
            onVisibleChange={visible =>
              handleVisibleChangeHandler(visible, addLayerPopoverKey)
            }
          >
            <CustomListItem selectable>
              <i
                data-test="add-annotation-layer-button"
                className="fa fa-plus"
              />{' '}
              &nbsp; {t('Add annotation layer')}
            </CustomListItem>
          </ControlPopover>
        </List>
      </div>
    ); 
};




AnnotationLayerControl.propTypes = propTypes;
AnnotationLayerControl.defaultProps = defaultProps;

// Tried to hook this up through stores/control.jsx instead of using redux
// directly, could not figure out how to get access to the color_scheme
function mapStateToProps({ charts, explore }) {
  const chartKey = getChartKey(explore);
  const chart = charts[chartKey] || charts[0] || {};

  return {
    // eslint-disable-next-line camelcase
    colorScheme: explore.controls?.color_scheme?.value,
    annotationError: chart.annotationError,
    annotationQuery: chart.annotationQuery,
    vizType: explore.controls.viz_type.value,
  };
}

function mapDispatchToProps(dispatch) {
  return {
    refreshAnnotationData: annotationObj =>
      dispatch(runAnnotationQuery(annotationObj)),
  };
}

const themedAnnotationLayerControl = withTheme(AnnotationLayerControl);

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(themedAnnotationLayerControl);
