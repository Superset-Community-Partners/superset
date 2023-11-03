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
import { OptionSortType } from 'src/explore/types';
import AdhocFilterEditPopover from 'src/explore/components/controls/FilterControl/AdhocFilterEditPopover';
import AdhocFilter from 'src/explore/components/controls/FilterControl/AdhocFilter';
import { ExplorePopoverContent } from 'src/explore/components/ExploreContentPopover';
import { Operators } from 'src/explore/constants';
import ControlPopover from '../../ControlPopover/ControlPopover';

interface AdhocFilterPopoverTriggerProps {
  sections?: string[];
  operators?: Operators[];
  adhocFilter: AdhocFilter;
  options: OptionSortType[];
  datasource: Record<string, any>;
  onFilterEdit: (editedFilter: AdhocFilter) => void;
  partitionColumn?: string;
  isControlledComponent?: boolean;
  visible?: boolean;
  togglePopover?: (visible: boolean) => void;
  closePopover?: () => void;
  requireSave?: boolean;
}

interface AdhocFilterPopoverTriggerState {
  popoverVisible: boolean;
}

const AdhocFilterPopoverTrigger = (props: AdhocFilterPopoverTriggerProps) => {
  const [popoverVisible, setPopoverVisible] = useState(false);

  const onPopoverResizeHandler = useCallback(() => {
    forceUpdateHandler();
  }, []);
  const closePopoverHandler = useCallback(() => {
    togglePopoverHandler(false);
  }, []);
  const togglePopoverHandler = useCallback((visible: boolean) => {
    setPopoverVisible(visible);
  }, []);

  const { adhocFilter, isControlledComponent } = props;

  const { visible, togglePopover, closePopover } = isControlledComponent
    ? {
        visible: props.visible,
        togglePopover: props.togglePopover,
        closePopover: props.closePopover,
      }
    : {
        visible: popoverVisible,
        togglePopover: togglePopoverHandler,
        closePopover: closePopoverHandler,
      };
  const overlayContent = (
    <ExplorePopoverContent>
      <AdhocFilterEditPopover
        adhocFilter={adhocFilter}
        options={props.options}
        datasource={props.datasource}
        partitionColumn={props.partitionColumn}
        onResize={onPopoverResizeHandler}
        onClose={closePopover}
        sections={props.sections}
        operators={props.operators}
        onChange={props.onFilterEdit}
        requireSave={props.requireSave}
      />
    </ExplorePopoverContent>
  );

  return (
    <ControlPopover
      trigger="click"
      content={overlayContent}
      defaultVisible={visible}
      visible={visible}
      onVisibleChange={togglePopover}
      destroyTooltipOnHide
    >
      {props.children}
    </ControlPopover>
  );
};

export default AdhocFilterPopoverTrigger;
