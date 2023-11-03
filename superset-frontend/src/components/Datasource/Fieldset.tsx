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

import React, { useCallback } from 'react';
import { Form } from 'src/components/Form';

import { recurseReactClone } from './utils';
import Field from './Field';

interface FieldsetProps {
  children: React.ReactNode;
  onChange: Function;
  item: Record<string, any>;
  title: React.ReactNode;
  compact: boolean;
}

type fieldKeyType = string | number;

const Fieldset = (inputProps: FieldsetProps) => {
  const props = {
    compact: false,
    title: null,
    ...inputProps,
  };
  const onChangeHandler = useCallback((fieldKey: fieldKeyType, val: any) => {
    return props.onChange({
      ...props.item,
      [fieldKey]: val,
    });
  }, []);

  const { title } = props;
  const propExtender = (field: { props: { fieldKey: fieldKeyType } }) => ({
    onChange: onChangeHandler,
    value: props.item[field.props.fieldKey],
    compact: props.compact,
  });
  return (
    <Form className="CRUD" layout="vertical">
      {title && <legend>{title}</legend>}
      {recurseReactClone(props.children, Field, propExtender)}
    </Form>
  );
};

export default Fieldset;
