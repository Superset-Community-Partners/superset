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
import { TextArea } from 'src/components/Input';
import { t, withTheme } from '@superset-ui/core';

import Button from 'src/components/Button';
import { TextAreaEditor } from 'src/components/AsyncAceEditor';
import ModalTrigger from 'src/components/ModalTrigger';

import ControlHeader from 'src/explore/components/ControlHeader';

const propTypes = {
  name: PropTypes.string,
  onChange: PropTypes.func,
  initialValue: PropTypes.string,
  height: PropTypes.number,
  minLines: PropTypes.number,
  maxLines: PropTypes.number,
  offerEditInModal: PropTypes.bool,
  language: PropTypes.oneOf([
    null,
    'json',
    'html',
    'sql',
    'markdown',
    'javascript',
  ]),
  aboveEditorSection: PropTypes.node,
  readOnly: PropTypes.bool,
  resize: PropTypes.oneOf([
    null,
    'block',
    'both',
    'horizontal',
    'inline',
    'none',
    'vertical',
  ]),
  textAreaStyles: PropTypes.object,
};

const defaultProps = {
  onChange: () => {},
  initialValue: '',
  height: 250,
  minLines: 3,
  maxLines: 10,
  offerEditInModal: true,
  readOnly: false,
  resize: null,
  textAreaStyles: {},
};

const TextAreaControl = props => {
  const onControlChangeHandler = useCallback(event => {
    const { value } = event.target;
    props.onChange(value);
  }, []);
  const onAreaEditorChangeHandler = useCallback(value => {
    props.onChange(value);
  }, []);
  const renderEditorHandler = useCallback((inModal = false) => {
    const minLines = inModal ? 40 : props.minLines || 12;
    if (props.language) {
      const style = {
        border: `1px solid ${props.theme.colors.grayscale.light1}`,
        minHeight: `${minLines}em`,
        width: 'auto',
        ...props.textAreaStyles,
      };
      if (props.resize) {
        style.resize = props.resize;
      }
      if (props.readOnly) {
        style.backgroundColor = '#f2f2f2';
      }

      return (
        <TextAreaEditor
          mode={props.language}
          style={style}
          minLines={minLines}
          maxLines={inModal ? 1000 : props.maxLines}
          editorProps={{ $blockScrolling: true }}
          defaultValue={props.initialValue}
          readOnly={props.readOnly}
          key={props.name}
          {...props}
          onChange={onAreaEditorChangeHandler.bind(this)}
        />
      );
    }
    return (
      <TextArea
        placeholder={t('textarea')}
        onChange={onControlChangeHandler.bind(this)}
        defaultValue={props.initialValue}
        disabled={props.readOnly}
        style={{ height: props.height }}
      />
    );
  }, []);
  const renderModalBodyHandler = useCallback(() => {
    return (
      <>
        <div>{props.aboveEditorSection}</div>
        {renderEditorHandler(true)}
      </>
    );
  }, []);

  const controlHeader = <ControlHeader {...props} />;
  return (
    <div>
      {controlHeader}
      {renderEditorHandler()}
      {props.offerEditInModal && (
        <ModalTrigger
          modalTitle={controlHeader}
          triggerNode={
            <Button buttonSize="small" className="m-t-5">
              {t('Edit')} <strong>{props.language}</strong> {t('in modal')}
            </Button>
          }
          modalBody={renderModalBodyHandler(true)}
          responsive
        />
      )}
    </div>
  );
};

TextAreaControl.propTypes = propTypes;
TextAreaControl.defaultProps = defaultProps;

export default withTheme(TextAreaControl);
