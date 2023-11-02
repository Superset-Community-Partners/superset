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
import cx from 'classnames';
import {
    css,
    FeatureFlag,
    isFeatureEnabled,
    styled,
    t,
} from '@superset-ui/core';

import DragDroppable from 'src/dashboard/components/dnd/DragDroppable';
import DragHandle from 'src/dashboard/components/dnd/DragHandle';
import DashboardComponent from 'src/dashboard/containers/DashboardComponent';
import DeleteComponentButton from 'src/dashboard/components/DeleteComponentButton';
import HoverMenu from 'src/dashboard/components/menu/HoverMenu';
import Icons from 'src/components/Icons';
import IconButton from 'src/dashboard/components/IconButton';
import BackgroundStyleDropdown from 'src/dashboard/components/menu/BackgroundStyleDropdown';
import WithPopoverMenu from 'src/dashboard/components/menu/WithPopoverMenu';
import { componentShape } from 'src/dashboard/util/propShapes';
import backgroundStyleOptions from 'src/dashboard/util/backgroundStyleOptions';
import { BACKGROUND_TRANSPARENT } from 'src/dashboard/util/constants';
import { isCurrentUserBot } from 'src/utils/isBot';

const propTypes = {
  id: PropTypes.string.isRequired,
  parentId: PropTypes.string.isRequired,
  component: componentShape.isRequired,
  parentComponent: componentShape.isRequired,
  index: PropTypes.number.isRequired,
  depth: PropTypes.number.isRequired,
  editMode: PropTypes.bool.isRequired,

  // grid related
  availableColumnCount: PropTypes.number.isRequired,
  columnWidth: PropTypes.number.isRequired,
  occupiedColumnCount: PropTypes.number.isRequired,
  onResizeStart: PropTypes.func.isRequired,
  onResize: PropTypes.func.isRequired,
  onResizeStop: PropTypes.func.isRequired,

  // dnd
  handleComponentDrop: PropTypes.func.isRequired,
  deleteComponent: PropTypes.func.isRequired,
  updateComponents: PropTypes.func.isRequired,
};

const GridRow = styled.div`
  ${({ theme }) => css`
    position: relative;
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: flex-start;
    width: 100%;
    height: fit-content;

    & > :not(:last-child):not(.hover-menu) {
      margin-right: ${theme.gridUnit * 4}px;
    }

    &.grid-row--empty {
      min-height: ${theme.gridUnit * 25}px;
    }
  `}
`;

const emptyRowContentStyles = theme => css`
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${theme.colors.text.label};
`;

const Row = (props) => {


    const [isFocused, setIsFocused] = useState(false);
    const [isInView, setIsInView] = useState(false);

    // if chart rendered - remove it if it's more than 4 view heights away from current viewport
    useEffect(() => {
    if (
      isFeatureEnabled(FeatureFlag.DASHBOARD_VIRTUALIZATION) &&
      !isCurrentUserBot()
    ) {
      observerEnablerHandler = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !isInView) {
            setIsInView(true);
          }
        },
        {
          rootMargin: '100% 0px',
        },
      );
      observerDisablerHandler = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting && isInView) {
            setIsInView(false);
          }
        },
        {
          rootMargin: '400% 0px',
        },
      );
      const element = containerRefHandler.current;
      if (element) {
        observerEnablerHandler.observe(element);
        observerDisablerHandler.observe(element);
      }
    }
  }, [isInView]);
    useEffect(() => {
    return () => {
    observerEnablerHandler?.disconnect();
    observerDisablerHandler?.disconnect();
  };
}, []);
    const handleChangeFocusHandler = useCallback((nextFocus) => {
    setStateHandler(() => ({ isFocused: Boolean(nextFocus) }));
  }, []);
    const handleUpdateMetaHandler = useCallback((metaKey, nextValue) => {
    const { updateComponents, component } = props;
    if (nextValue && component.meta[metaKey] !== nextValue) {
      updateComponents({
        [component.id]: {
          ...component,
          meta: {
            ...component.meta,
            [metaKey]: nextValue,
          },
        },
      });
    }
  }, []);
    const handleDeleteComponentHandler = useCallback(() => {
    const { deleteComponent, component, parentId } = props;
    deleteComponent(component.id, parentId);
  }, []);

    const {
      component: rowComponent,
      parentComponent,
      index,
      availableColumnCount,
      columnWidth,
      occupiedColumnCount,
      depth,
      onResizeStart,
      onResize,
      onResizeStop,
      handleComponentDrop,
      editMode,
      onChangeTab,
      isComponentVisible,
    } = props;

    const rowItems = rowComponent.children || [];

    const backgroundStyle = backgroundStyleOptions.find(
      opt =>
        opt.value === (rowComponent.meta.background || BACKGROUND_TRANSPARENT),
    );

    return (
      <DragDroppable
        component={rowComponent}
        parentComponent={parentComponent}
        orientation="row"
        index={index}
        depth={depth}
        onDrop={handleComponentDrop}
        editMode={editMode}
      >
        {({ dropIndicatorProps, dragSourceRef }) => (
          <WithPopoverMenu
            isFocused={isFocused}
            onChangeFocus={handleChangeFocusHandler}
            disableClick
            menuItems={[
              <BackgroundStyleDropdown
                id={`${rowComponent.id}-background`}
                value={backgroundStyle.value}
                onChange={handleChangeBackgroundHandler}
              />,
            ]}
            editMode={editMode}
          >
            {editMode && (
              <HoverMenu innerRef={dragSourceRef} position="left">
                <DragHandle position="left" />
                <DeleteComponentButton onDelete={handleDeleteComponentHandler} />
                <IconButton
                  onClick={handleChangeFocusHandler}
                  icon={<Icons.Cog iconSize="xl" />}
                />
              </HoverMenu>
            )}
            <GridRow
              className={cx(
                'grid-row',
                rowItems.length === 0 && 'grid-row--empty',
                backgroundStyle.className,
              )}
              data-test={`grid-row-${backgroundStyle.className}`}
              ref={containerRefHandler}
            >
              {rowItems.length === 0 ? (
                <div css={emptyRowContentStyles}>{t('Empty row')}</div>
              ) : (
                rowItems.map((componentId, itemIndex) => (
                  <DashboardComponent
                    key={componentId}
                    id={componentId}
                    parentId={rowComponent.id}
                    depth={depth + 1}
                    index={itemIndex}
                    availableColumnCount={
                      availableColumnCount - occupiedColumnCount
                    }
                    columnWidth={columnWidth}
                    onResizeStart={onResizeStart}
                    onResize={onResize}
                    onResizeStop={onResizeStop}
                    isComponentVisible={isComponentVisible}
                    onChangeTab={onChangeTab}
                    isInView={isInView}
                  />
                ))
              )}

              {dropIndicatorProps && <div {...dropIndicatorProps} />}
            </GridRow>
          </WithPopoverMenu>
        )}
      </DragDroppable>
    ); 
};




Row.propTypes = propTypes;

export default Row;
