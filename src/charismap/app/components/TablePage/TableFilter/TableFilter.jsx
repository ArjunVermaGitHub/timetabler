
// import React, { useEffect, useState } from 'react';
// import { Form, Row, Col, Drawer, Collapse, Button, message } from 'antd';
// import {getFormItem, Amount, CustomDatePicker } from 'spf-common-ui/dist';
// import './TableFilter.scss';
// import { UpOutlined, RightOutlined } from '@ant-design/icons';
// import { useDispatch } from 'react-redux';
// import { setTable } from 'store/slices/tables';
// import { useForm } from 'antd/lib/form/Form';
// import moment from 'moment';

// const TableFilter = ({
//   fetchFunction,
//   filterProps,
//   name,
//   open,
//   onClose,
//   setData,
//   setOpen,
//   tableParams,
//   setTableParams,
//   beFiltering,
//   setFilterCount,
//   moduleType
// }) => {

//   const dispatch = useDispatch();
//   const [form] = useForm();
//   const [filter, setFilter] = useState('');
//   const { Panel } = Collapse;

//   const setStateData = (res) => {
//     setData(res.data)
//     setTableParams({ ...tableParams, page: 1, skip: 0, total: res?.count || res?.data?.length, filter: moduleType === 'clm' ? clmFilter() : filter });
//     dispatch(setTable({ payload: res.data, key: name }));
//     setFilterCount(getFilterCount());
//     setOpen(false)
//   }; 

//   const onFinish = () => {
//     // Early return if no filters are selected
//     if (getFilterCount() > 0) {
//       fetchFunction({
//         ...tableParams,
//         skip: 0,
//         page: 1,
//         limit: (!beFiltering ? 1000 : tableParams.limit),
//         filters: moduleType === 'clm' ? clmFilter() : filter
//       })?.then(setStateData);
//     }
//     else {
//       message.error('Please select at least one filter');
//     }
//   }

//   const clmFilter = () => {
//     const activeTabFilter = form.getFieldsValue(true);
//     const filterData = Object.entries(activeTabFilter).reduce((acc, [key, value]) => {
//       // Skip empty values early
//       if (isEmpty(value)) return acc;

//       // Cache the activeKeyObj lookup
//       let filtersComp = filterProps?.reduce((acc, el) => {
//         return [...(acc || []), ...(el.filters || [])]
//       }, []);
//       const activeKeyObj = filtersComp.find(val => key.includes(val.key)) || {};
//       const comparisonOperator = activeKeyObj.comparisonOperator?.toLowerCase();

//       // Handle date range filters
//       if (key.includes("_from") || key.includes("_to")) {
//         // Find the base filter key (e.g., "date_from" or "date_to")
//         const activeKeyObj = filtersComp.find(val =>
//           key.startsWith(val.key) ||
//           key.replace(/_\d+$/, '').startsWith(val.key)
//         ) || {};

//         // Get the main key without _from/_to
//         const mainKey = (activeKeyObj.key || key)
//           .replace("_from", '')
//           .replace("_to", '');

//         // Find corresponding from and to keys with their suffixes
//         const fromKey = Object.keys(activeTabFilter).find(k =>
//           k.startsWith(`${mainKey}_from`)
//         );
//         const toKey = Object.keys(activeTabFilter).find(k =>
//           k.startsWith(`${mainKey}_to`)
//         );

//         if (mainKey) {
//           const fromValue = formatDateIfNeeded(activeTabFilter[fromKey], mainKey);
//           const toValue = formatDateIfNeeded(activeTabFilter[toKey], mainKey);
//           const filterString = fromToCommonFunctionData(fromValue, toValue, mainKey);
//           if (filterString) acc.push(filterString);
//         }
//         return acc;
//       }

//       // Handle array values with 'in' operator
//       if (comparisonOperator === 'in') {
//         if (Array.isArray(value) && value.length > 0) {
//           acc.push(`${key}:in:${value.join(',')}`);
//         } else if (value) {
//           acc.push(`${key}:in:${value}`);
//         }
//         return acc;
//       }

//       // Handle comparison operators
//       const formattedValue = formatDateIfNeeded(value, key);
//       if (formattedValue == null) return acc;

//       if (['eq', 'gte', 'lte'].includes(comparisonOperator)) {
//         acc.push(`${key}:${comparisonOperator}:${formattedValue}`);
//       } else {
//         acc.push(`${key}:iLike:${formattedValue}`);
//       }

//       return acc;
//     }, []);

//     // Use Set for deduplication
//     const uniqueFilters = [...new Set(filterData)].join(';');
//     return uniqueFilters;
//   }


//   const fromToCommonFunctionData = (from, to, keyName) => {
//     if (!keyName) return null;
//     if (from && to) {
//       if (keyName.includes('date') && from === to) {
//         // Create next date using moment and format it
//         const nextDate = moment(to).add(1, 'days').format('YYYY-MM-DD');
//         return `${keyName}:between:${from},${nextDate}`;
//       }
//       return `${keyName}:between:${from},${to}`;
//     } else if (from) {
//       return `${keyName}:gte:${from}`;
//     } else if (to) {
//       return `${keyName}:lte:${to}`;
//     }
//     return null;
//   };



//   const formatDateIfNeeded = (value, key) => {
//     if (!value || !key) return value;

//     try {
//       if (moment(value, moment.ISO_8601, true).isValid() && key.includes('date')) {
//         return moment(value).format("YYYY-MM-DD");
//       }
//       else if (key.includes('amount') && typeof value === 'string' && /,/g.test(value)) {
//         return commonCommaNumberFormatHandler({ value, format: "No Comma" });
//       }
//       return value;
//     } catch (error) {
//       console.error('Error in formatDateIfNeeded:', error);
//       return value;
//     }
//   };

//   const commonCommaNumberFormatHandler = ({ value, format, isPrecisionRequired = false }) => {
//     if (!value) return value;

//     try {
//       let processedValue = value;

//       if (format === "Comma") {
//         if (typeof processedValue !== 'number') {
//           processedValue = parseFloat(processedValue.replace(/,/g, ''));
//         }
//         processedValue = parseFloat(processedValue).toFixed(2);
//         const [intPart, decPart] = processedValue.toString().split(".");
//         return `${parseInt(intPart).toLocaleString("en-IN")}.${decPart}`;
//       }

//       if (format === "No Comma") {
//         if (typeof processedValue === 'number') {
//           processedValue = isPrecisionRequired ?
//             parseFloat(processedValue) :
//             parseFloat(processedValue).toFixed(2);
//         } else {
//           processedValue = parseFloat(processedValue.replace(/,/g, ''));
//         }
//         return processedValue;
//       }

//       return processedValue;
//     } catch (err) {
//       console.error('Error in commonCommaNumberFormatHandler:', err);
//       return value;
//     }
//   };



//   // Reset filters
//   const handleReset = () => {
//     form.resetFields();
//     setFilter('');
//     setTableParams({
//       ...tableParams,
//       filter: '',
//       page: 1,
//       skip: 0,
//       searchParams: {}
//     });
//     fetchFunction({ ...tableParams, skip: 0, page: 1, limit: (!beFiltering ? 1000 : tableParams.limit), filters: '' })?.then(setStateData);
//   };

//   const newFilter = (subItem, e) => {
//     //from start of between string to end of
//     let betweenString = subItem?.key + ':between:'
//     let ipValue
//     switch (subItem?.type) {
//       case 'select':
//         if (subItem?.mode === 'multiple') {
//           ipValue = e.join('|')
//         }
//         else
//           ipValue = e
//         break
//       case 'date':        
//         if (!e)
//           ipValue = ''
//         else
//           ipValue = e?.format("YYYY-MM-DD")
//         break
//       case 'checkbox':
//         ipValue = e.join('|')
//         break;
//       default:
//         ipValue = e.target.value.replace(/,/g, '')
//         break
//     }

//     let startIndex = filter.indexOf(subItem?.key + subItem?.comparisonOperator.includes('between') ? ':between:' : ':' + subItem?.comparisonOperator + ':')
//     let endIndex = startIndex
//     let pipeIndex = startIndex
//     for (let i = startIndex; i < filter.length; i++) {
//       endIndex = i
//       if (filter[i] === '|') {
//         pipeIndex = i
//       }
//       if (filter[i] === ',') {
//         endIndex = i - 1
//         break
//       }
//     }
//     if (subItem?.comparisonOperator === 'between1') {
//       if (filter.indexOf(subItem?.key + ':between:') !== -1) {
//         if (!ipValue && pipeIndex === endIndex) {
//           return filter.replace(filter.slice(Math.max(startIndex - 1, 0), pipeIndex + 1), '')
//         }
//         return filter.replace(filter.slice(startIndex, pipeIndex + 1), subItem?.key + ':between:' + ipValue + '|')
//       }
//       else {
//         betweenString += ipValue + '|'
//       }
//     }
//     else if (subItem?.comparisonOperator === 'between2') {
//       if (startIndex !== -1) {
//         if (!ipValue && filter.slice(startIndex, pipeIndex + 1) === subItem?.key + ':between:|') {
//           return filter.replace(filter.slice(startIndex, endIndex + 2), '')
//         }
//         return filter.replace(filter.slice(startIndex, endIndex + 1), filter.slice(startIndex, pipeIndex + 1) + ipValue)
//       }
//       else {
//         betweenString += "|" + ipValue
//       }
//     }
//     else {
//       startIndex = filter.indexOf(subItem?.key + ':' + subItem?.comparisonOperator)
//       endIndex = startIndex
//       for (let i = startIndex; i < filter.length; i++) {
//         endIndex = i
//         if (filter[i] === ',') {
//           endIndex = i - 1
//           break
//         }
//       }
//       if (startIndex !== -1) {
//         if (!ipValue) {
//           return filter.replace(filter.slice(endIndex === filter.length - 1 ? startIndex - 1 : startIndex, endIndex + 2), '')
//         }
//         if (subItem?.comparisonOperator === 'in') {
//           let ipValues = form.getFieldValue(subItem?.name).join('|')
//           return filter.replace(filter.slice(startIndex, endIndex + 1), ipValues ? subItem?.key + ':' + subItem?.comparisonOperator + ':' + ipValues : '')
//         }
//         return filter.replace(filter.slice(startIndex, endIndex + 1), subItem?.key + ':' + subItem?.comparisonOperator + ':' + ipValue)
//       }
//     }

//     return filter + (filter.length && filter.at(-1) !== ',' && filter.at(-1) !== '|' ? ',' : '') +
//       (
//         subItem?.comparisonOperator === 'between1' || subItem?.comparisonOperator === 'between2' ? betweenString :
//           subItem?.key + ':' + subItem?.comparisonOperator + ':' + ipValue
//       )
//   }


//   useEffect(() => {
//     return () => {
//       form.resetFields()
//     }
//   }, [])

//   const isEmpty = (value) => {
//     if (value === null || value === undefined) {
//       return true;
//     }

//     if (typeof value === 'string') {
//       return value.trim() === '';
//     }

//     if (Array.isArray(value)) {
//       return value.length === 0;
//     }

//     if (typeof value === 'object') {
//       return Object.keys(value).length === 0;
//     }

//     if (typeof value === 'number') {
//       return false;  // Numbers are never considered empty
//     }

//     return !value;
//   };
// const getFilterCount = () => {
//   const activeTabFilter = form.getFieldsValue(true);
//   return Object.entries(activeTabFilter).reduce((count, [key, value]) =>
//     !isEmpty(value)
//       ? (Array.isArray(value) ? count + value.length : count + 1)
//       : count
//     , 0);
// };

//   const getFilterCountForPanel = (identifiers) => {
//     const activeTabFilter = form.getFieldsValue(true);
//     return Object.entries(activeTabFilter).reduce((count, [key, value]) =>
//       key.startsWith(identifiers) && !isEmpty(value)
//         ? (Array.isArray(value) ? count + value.length : count + 1)
//         : count
//       , 0);
//   };
//   const getPanelFilterCount = (panelName, identifiers) => {
//     // Assume we have a way to get the filter count for each panel
//     const filterCount = getFilterCountForPanel(identifiers);
//     return (
//       <space style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
//         <span class="">{panelName} </span>
//         {filterCount > 0 && (
//           <span class="ant-tag ant-tag-processing ml-[10px]">
//             {filterCount}
//           </span>
//         )}
//       </space>

//     );
//   };



//   return (<>
//     <Drawer
//       title="Filter"
//       className='commonFilter'
//       placement={'right'}
//       width={450}
//       onClose={onClose}
//       open={open}
//     >
//       <Form form={form} onFinish={onFinish}>
//         <Collapse
//           accordion
//           bordered={false}
//           expandIconPosition="right"
//           defaultActiveKey={['1']}
//           expandIcon={({ isActive }) => (isActive ? <UpOutlined /> : <RightOutlined />)}
//           style={{
//             background: '#fff',
//           }}
//         // className = {formValue ? 'clear' : ''}
//         >

//           {filterProps?.map((item, index) => {
//             return (
//               <Panel header={
//                 getPanelFilterCount(item?.headerName, item?.key)
//               } key={index + 1}>
//                 <div className="relative">
//                   <Row gutter={12}>
//                     {item?.filters?.map((subItem, subIndex) => (    //subItem: {key: string, symbol: enum([in,ilike,eq,]) }
//                       <Col span={subItem.col || 24} key={subIndex}>
//                         {subItem?.type === 'amount' ?
//                           <Amount
//                             form={form}
//                             label=''
//                             key={subItem?.key}
//                             name={subItem?.name}
//                             onBlur={(e) => {
//                               setTimeout(() => {
//                                 setFilter(newFilter(subItem, e))
//                               }, 100)
//                             }}
//                             placeholder={subItem?.placeholder ?? "No Data"}
//                           />
//                           :
//                           (
//                             subItem?.type === 'date' ?
//                               <CustomDatePicker
//                                 className='DOB'
//                                 form={form}
//                                 label=''
//                                 keyName={subItem?.key}
//                                 name={subItem?.name}
//                                 required={subItem?.required === false}
//                                 disabledDate={subItem?.disabledDate ? subItem?.disabledDate() : () => { }}
//                                 onChange={(e) => {
//                                   setTimeout(() => {
//                                     setFilter(newFilter(subItem, e))
//                                   }, 10)
//                                 }}
//                                 placeholder={subItem?.placeholder ?? "No Data"}
//                               />
//                               : getFormItem(subItem?.type, {
//                                 key: subItem?.key,
//                                 name: subItem?.name,
//                                 required: !(subItem?.required === false),
//                                 rules: [
//                                   {
//                                     validator: async (_, val) => {
//                                       if (subItem?.type === 'date') {
//                                         setFilter(newFilter(subItem, val))
//                                       }
//                                       return Promise.resolve()
//                                     }
//                                   }
//                                 ],
//                                 ...subItem
//                               },
//                                 {
//                                   onChange: (e) => {
//                                     setFilter(newFilter(subItem, e))
//                                     if (subItem && subItem?.isValueLinked && Array.isArray(subItem.linkedList)) {
//                                       const data = subItem?.linkedList.filter(ele => ele[subItem?.key] === e);
//                                       form.setFieldValue(`${subItem.linkedKey}`, data?.[0]?.[subItem?.linkedKey] || "");
//                                     }
//                                     subItem?.onChangeRequest && subItem.onChangeRequest(e);
//                                   },
//                                   options: subItem?.options,
//                                   mode: subItem?.mode,
//                                   placeholder: subItem?.placeholder ?? "No Data",
//                                   ...subItem
//                                 }
//                               ))
//                         }
//                       </Col>
//                     ))}
//                   </Row>
//                 </div>
//               </Panel>
//             )
//           })}

//         </Collapse>
//         <div className='flex justify-between absolute w-[100%] bottom-[0] px-[5%] pt-[16px] pb-4 border-t border-[#D2D3D5] bg-white'>
//           <Button
//             className={'px-[28px] float-left bg-[#ffffff] text-[#008DD0] border-[#008DD0] hover:bg-[#008DD0] hover:text-[#ffffff] border-2 hover:border-[#008DD0] focus:bg-[#008DD0] focus:text-[#ffffff] disabled:!opacity-[30%] transition-all font-semibold rounded-[5px] h-10 text-[14px]'}
//             onClick={handleReset}
//           >Reset</Button>
//           <Button
//             htmlType='submit'
//             className="px-[28px] float-right bg-[#008DD0] text-white hover:bg-[#0074AB] hover:text-[#ffffff]  focus:bg-[#0074AB]  transition-all font-semibold rounded-[5px] disabled:!opacity-[30%] h-10 text-[14px] focus:text-[#ffffff]"
//           >
//             Apply All
//           </Button>
//         </div>
//       </Form>
//     </Drawer>
//   </>)
// };
// export default TableFilter;