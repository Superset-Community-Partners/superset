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
import { List } from 'src/components';
import shortid from 'shortid';
import { t, withTheme } from '@superset-ui/core';
import {
    SortableContainer,
    SortableHandle,
    SortableElement,
    arrayMove,
} from 'react-sortable-hoc';
import Icons from 'src/components/Icons';
import {
    HeaderContainer,
    AddIconButton,
} from 'src/explore/components/controls/OptionControls';
import { InfoTooltipWithTrigger } from '@superset-ui/chart-controls';
import ControlHeader from 'src/explore/components/ControlHeader';
import CustomListItem from 'src/explore/components/controls/CustomListItem';
import controlMap from '..';

const propTypes = {
  name: PropTypes.string.isRequired,
  label: PropTypes.string,
  description: PropTypes.string,
  placeholder: PropTypes.string,
  addTooltip: PropTypes.string,
  itemGenerator: PropTypes.func,
  keyAccessor: PropTypes.func,
  onChange: PropTypes.func,
  value: PropTypes.oneOfType([PropTypes.array]),
  isFloat: PropTypes.bool,
  isInt: PropTypes.bool,
  controlName: PropTypes.string.isRequired,
};

const defaultProps = {
  label: null,
  description: null,
  onChange: () => {},
  placeholder: t('Empty collection'),
  itemGenerator: () => ({ key: shortid.generate() }),
  keyAccessor: o => o.key,
  value: [],
  addTooltip: t('Add an item'),
};
const SortableListItem = SortableElement(CustomListItem);
const SortableList = SortableContainer(List);
const SortableDragger = SortableHandle(() => (
  <i
    role="img"
    aria-label="drag"
    className="fa fa-bars text-primary"
    style={{ cursor: 'ns-resize' }}
  />
));

const CollectionControl = (props) => {


    

    const onChangeHandler = useCallback((i, value) => {
    const newValue = [...props.value];
    newValue[i] = { ...props.value[i], ...value };
    props.onChange(newValue);
  }, []);
    const onAddHandler = useCallback(() => {
    props.onChange(props.value.concat([props.itemGenerator()]));
  }, []);
    const onSortEndHandler = useCallback(({ oldIndex, newIndex }) => {
    props.onChange(arrayMove(props.value, oldIndex, newIndex));
  }, []);
    const removeItemHandler = useCallback((i) => {
    props.onChange(props.value.filter((o, ix) => i !== ix));
  }, []);
    const renderListHandler = useCallback(() => {
    if (props.value.length === 0) {
      return <div className="text-muted">{props.placeholder}</div>;
    }
    const Control = controlMap[props.controlName];
    return (
      <SortableList
        useDragHandle
        lockAxis="y"
        onSortEnd={onSortEndHandler.bind(this)}
        bordered
        css={theme => ({
          borderRadius: theme.gridUnit,
        })}
      >
        {props.value.map((o, i) => {
          // label relevant only for header, not here
          const { label, ...commonProps } = props;
          return (
            <SortableListItem
              className="clearfix"
              css={{ justifyContent: 'flex-start' }}
              key={props.keyAccessor(o)}
              index={i}
            >
              <SortableDragger />
              <div
                css={theme => ({
                  flex: 1,
                  marginLeft: theme.gridUnit * 2,
                  marginRight: theme.gridUnit * 2,
                })}
              >
                <Control
                  {...commonProps}
                  {...o}
                  onChange={onChangeHandler.bind(this, i)}
                />
              </div>
              <InfoTooltipWithTrigger
                icon="times"
                label="remove-item"
                tooltip={t('Remove item')}
                bsStyle="primary"
                onClick={removeItemHandler.bind(this, i)}
              />
            </SortableListItem>
          );
        })}
      </SortableList>
    );
  }, []);

    const { theme } = props;
    return (
      <div data-test="CollectionControl" className="CollectionControl">
        <HeaderContainer>
          <ControlHeader {...props} />
          <AddIconButton onClick={onAddHandler}>
            <Icons.PlusLarge
              iconSize="s"
              iconColor={theme.colors.grayscale.light5}
            />
          </AddIconButton>
        </HeaderContainer>
        {renderListHandler()}
      </div>
    ); 
};




CollectionControl.propTypes = propTypes;
CollectionControl.defaultProps = defaultProps;

export default withTheme(CollectionControl);
