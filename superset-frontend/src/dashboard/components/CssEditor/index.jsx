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
import { AntdDropdown } from 'src/components';
import { Menu } from 'src/components/Menu';
import Button from 'src/components/Button';
import { t, styled } from '@superset-ui/core';
import ModalTrigger from 'src/components/ModalTrigger';
import { CssEditor as AceCssEditor } from 'src/components/AsyncAceEditor';

const StyledWrapper = styled.div`
  ${({ theme }) => `
    .css-editor-header {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      margin-bottom: ${theme.gridUnit * 2}px;

      h5 {
        margin-top: ${theme.gridUnit}px;
      }
    }
    .css-editor {
      border: 1px solid ${theme.colors.grayscale.light1};
    }
  `}
`;

const propTypes = {
  initialCss: PropTypes.string,
  triggerNode: PropTypes.node.isRequired,
  onChange: PropTypes.func,
  templates: PropTypes.array,
};

const defaultProps = {
  initialCss: '',
  onChange: () => {},
};

const CssEditor = (props) => {


    const [css, setCss] = useState(props.initialCss);

    useEffect(() => {
    AceCssEditor.preload();
  }, []);
    const changeCssHandler = useCallback((css) => {
    setStateHandler({ css }, () => {
      props.onChange(css);
    });
  }, [css]);
    const changeCssTemplateHandler = useCallback(({ key }) => {
    changeCssHandler(key);
  }, []);
    const renderTemplateSelectorHandler = useCallback(() => {
    if (props.templates) {
      const menu = (
        <Menu onClick={changeCssTemplateHandler}>
          {props.templates.map(template => (
            <Menu.Item key={template.css}>{template.label}</Menu.Item>
          ))}
        </Menu>
      );

      return (
        <AntdDropdown overlay={menu} placement="bottomRight">
          <Button>{t('Load a CSS template')}</Button>
        </AntdDropdown>
      );
    }
    return null;
  }, []);

    return (
      <ModalTrigger
        triggerNode={props.triggerNode}
        modalTitle={t('CSS')}
        modalBody={
          <StyledWrapper>
            <div className="css-editor-header">
              <h5>{t('Live CSS editor')}</h5>
              {renderTemplateSelectorHandler()}
            </div>
            <AceCssEditor
              className="css-editor"
              minLines={12}
              maxLines={30}
              onChange={changeCssHandler}
              height="200px"
              width="100%"
              editorProps={{ $blockScrolling: true }}
              enableLiveAutocompletion
              value={css || ''}
            />
          </StyledWrapper>
        }
      />
    ); 
};




CssEditor.propTypes = propTypes;
CssEditor.defaultProps = defaultProps;

export default CssEditor;
