import os
import json
import re
import shutil
import argparse

missing_examples = []

def load_json(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def write_markdown_file(file_path, content):
    with open(file_path, 'w', encoding='utf-8') as md_file:
        md_file.write(content)

def remove_js_comments(text):
    text = re.sub(r'^\s*//.*$', '', text, flags=re.MULTILINE)
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)
    return text.strip()

def correct_description(string):
    if string is None:
        return 'No description provided.'
    
    string = re.sub(r'<b>', '**', string)
    string = re.sub(r'</b>', '**', string)
    string = re.sub(r'<note>(.*?)</note>', r'💡 \1', string, flags=re.DOTALL)
    return string

def correct_default_value(value, enumerations, classes):
    if value is None:
        return ''
    
    if value == True:
        value = "true"
    elif value == False:
        value = "false"
    else:
        value = str(value)
    
    return generate_data_types_markdown([value], enumerations, classes)

def remove_line_breaks(string):
    return re.sub(r'[\r\n]+', ' ', string)

def convert_jsdoc_array_to_ts(type_str: str) -> str:
    pattern = re.compile(r'Array\.<([^>]+)>')
    
    while True:
        match = pattern.search(type_str)
        if not match:
            break
        
        inner_type = match.group(1).strip()
        inner_type = convert_jsdoc_array_to_ts(inner_type)
        
        type_str = (
            type_str[:match.start()] 
            + f"{inner_type}[]" 
            + type_str[match.end():]
        )
    
    return type_str

def escape_text_outside_code_blocks(markdown: str) -> str:
    parts = re.split(r'(```.*?```)', markdown, flags=re.DOTALL)
    
    for i in range(0, len(parts), 2):
        parts[i] = (parts[i]
                    .replace('<', '&lt;')
                    .replace('>', '&gt;')
                    .replace('{', '&#123;')
                    .replace('}', '&#125;')
                   )
    return "".join(parts)

def get_base_type(ts_type: str) -> str:
    while ts_type.endswith('[]'):
        ts_type = ts_type[:-2]
    return ts_type

def generate_data_types_markdown(types, enumerations, classes, root='../../'):
    converted = [convert_jsdoc_array_to_ts(t) for t in types]

    def link_if_known(ts_type):
        base = get_base_type(ts_type)

        for enum in enumerations:
            if enum['name'] == base:
                return f"[{ts_type}]({root}Enumeration/{base}.md)"

        if base in classes:
            return f"[{ts_type}]({root}{base}/{base}.md)"

        return ts_type

    linked = [link_if_known(ts_t) for ts_t in converted]

    param_types_md = r' \| '.join(linked)

    def replace_leftover_generics(match):
        element = match.group(1).strip()
        return f"&lt;{element}&gt;"
    
    param_types_md = re.sub(r'<([^<>]+)>', replace_leftover_generics, param_types_md)

    return param_types_md

def generate_class_markdown(class_name, methods, properties, enumerations, classes):
    description = classes.get(class_name,[])[0].get('description', '')

    content = f"# {class_name}\n\n{description}\n\n"
    content += generate_properties_markdown(properties, enumerations, classes)

    content += "## Methods\n\n"
    for method in methods:
        method_name = method['name']
        content += f"- [{method_name}](./Methods/{method_name}.md)\n"

    return escape_text_outside_code_blocks(content)

def generate_method_markdown(method, enumerations, classes, example_root_name):
    method_name = method['name']
    description = method.get('description', 'No description provided.')
    description = correct_description(description)
    params = method.get('params', [])
    returns = method.get('returns', [])
    examples = method.get('examples', [])  # Support multiple examples
    throws = method.get('throws', '')
    see_also = method.get('see_also', '')
    memberof = method.get('memberof', '')

    content = f"# {method_name}\n\n{description}\n\n"
    
    param_list = ', '.join([param['name'] for param in params]) if params else ''
    content += f"## Syntax\n\n```javascript\nexpression.{method_name}({param_list});\n```\n\n"
    if memberof:
        content += f"`expression` - A variable that represents a [{memberof}](../{memberof}.md) class.\n\n"

    # Parameters
    content += "## Parameters\n\n"
    if params:
        content += "| **Name** | **Required/Optional** | **Data type** | **Default** | **Description** |\n"
        content += "| ------------- | ------------- | ------------- | ------------- | ------------- |\n"
        for param in params:
            param_name = param.get('name', 'Unnamed')
            param_types = param.get('type', {}).get('names', []) if param.get('type') else []
            param_types_md = generate_data_types_markdown(param_types, enumerations, classes)
            param_desc = remove_line_breaks(correct_description(param.get('description', 'No description provided.')))
            param_required = "Required" if not param.get('optional') else "Optional"
            param_default = correct_default_value(param.get('defaultvalue', ''), enumerations, classes)

            content += f"| {param_name} | {param_required} | {param_types_md} | {param_default} | {param_desc} |\n"
    else:
        content += "This method doesn't have any parameters.\n"

    # Returns
    content += "\n## Returns\n\n"
    if returns:
        return_type_list = returns[0].get('type', {}).get('names', [])
        return_type_md = generate_data_types_markdown(return_type_list, enumerations, classes)
        content += return_type_md
    else:
        content += "This method doesn't return any data."
    
    # Multiple Examples
    if examples:
        content += "\n\n## Examples\n\n"
        for i, example in enumerate(examples):
            if example.strip():
                # Check if example already contains proper markdown formatting
                if '```' in example:
                    content += f"{example}\n\n"
                else:
                    # Wrap in code block if not already formatted
                    content += f"```typescript\n{example.strip()}\n```\n\n"
    
    # Throws section
    if throws:
        content += f"\n## Throws\n\n{throws}\n"
    
    # See Also section
    if see_also:
        content += see_also

    return escape_text_outside_code_blocks(content)

def generate_properties_markdown(properties, enumerations, classes, root='../'):
    if properties is None:
        return ''
    
    content = "## Properties\n\n"
    content += "| Name | Type | Description |\n"
    content += "| ---- | ---- | ----------- |\n"

    for prop in properties:
        prop_name = prop['name']
        prop_description = prop.get('description', 'No description provided.')
        prop_description = remove_line_breaks(correct_description(prop_description))
        prop_types = prop['type']['names'] if prop.get('type') else []
        param_types_md = generate_data_types_markdown(prop_types, enumerations, classes, root)
        content += f"| {prop_name} | {param_types_md} | {prop_description} |\n"

    # Escape outside code blocks
    return escape_text_outside_code_blocks(content)

def generate_enumeration_markdown(enumeration, enumerations, classes, example_root_name):
    enum_name = enumeration['name']
    description = enumeration.get('description', 'No description provided.')
    description = correct_description(description)
    example = enumeration.get('example', '')
    properties = enumeration.get('properties', [])

    content = f"# {enum_name}\n\n{description}\n\n"
    
    # Check if we have type information
    if 'type' in enumeration and 'parsedType' in enumeration['type']:
        ptype = enumeration['type']['parsedType']
        if ptype['type'] == 'TypeUnion':
            enum_empty = True # is empty enum

            content += "## Type\n\nEnumeration\n\n"
            content += "## Values\n\n"
            # Each top-level name in the union
            for raw_t in enumeration['type'].get('names', []):
                ts_t = convert_jsdoc_array_to_ts(raw_t)

                # Attempt linking: we compare the raw type to enumerations/classes
                if any(enum['name'] == raw_t for enum in enumerations):
                    content += f"- [{ts_t}](../Enumeration/{raw_t}.md)\n"
                    enum_empty = False
                elif raw_t in classes:
                    content += f"- [{ts_t}](../{raw_t}/{raw_t}.md)\n"
                    enum_empty = False
                elif ts_t.find('Api') == -1:
                    content += f"- {ts_t}\n"
                    enum_empty = False
            
            if enum_empty == True:
                return None
    
    # If we have properties, display them
    if properties:
        if 'type' not in enumeration or 'parsedType' not in enumeration['type']:
            content += "## Type\n\nObject\n\n"
        
        content += "## Properties\n\n"
        content += "| Name | Type | Description |\n"
        content += "| ---- | ---- | ----------- |\n"

        for prop in properties:
            prop_name = prop['name']
            prop_description = remove_line_breaks(correct_description(prop.get('description', 'No description provided.')))
            prop_types = prop.get('type', {}).get('names', [])
            param_types_md = generate_data_types_markdown(prop_types, enumerations, classes, '../')
            content += f"| {prop_name} | {param_types_md} | {prop_description} |\n"
    
    # If it's neither a union nor has properties, simply print the type(s) if available
    elif 'type' in enumeration and 'names' in enumeration['type']:
        content += "## Type\n\n"
        types = enumeration['type']['names']
        t_md = generate_data_types_markdown(types, enumerations, classes)
        content += t_md + "\n\n"

    # Example
    if example:
        if '```js' in example:
            comment, code = example.split('```js', 1)
            comment = remove_js_comments(comment)
            content += f"\n\n## Example\n\n{comment}\n\n```javascript {example_root_name}\n{code.strip()}\n"
        else:
            # If there's no triple-backtick structure
            cleaned_example = remove_js_comments(example)
            content += f"\n\n## Example\n\n```javascript {example_root_name}\n{cleaned_example}\n```\n"

    return escape_text_outside_code_blocks(content)

def process_docs(data, output_dir, root_name):
    classes = {}
    classes_props = {}
    enumerations = []
    root_dir =  os.path.join(output_dir, root_name)
    example_root_name = 'example-sdk'
    
    for child in data.get('children', []):
        kind = child.get('kind')
        
        if kind == 8:  # Enum
            item = {
                'kind': 'typedef',
                'name': child.get('name', ''),
                'description': get_comment_text(child.get('comment', {})),
                'type': {
                    'names': [],
                    'parsedType': {'type': 'TypeUnion'}
                },
                'properties': []
            }
            
            for enum_member in child.get('children', []):
                enum_value = enum_member.get('type', {}).get('value')
                if enum_value:
                    item['type']['names'].append(enum_value)
                
                item['properties'].append({
                    'name': enum_member.get('name', ''),
                    'description': get_comment_text(enum_member.get('comment', {})),
                    'type': {'names': [enum_value]}
                })
                
            enumerations.append(item)
            
        elif kind == 128 or kind == 256:  # Class or Interface
            class_name = child.get('name', '')
            class_item = {
                'kind': 'class',
                'name': class_name,
                'description': get_comment_text(child.get('comment', {})),
                'properties': []
            }
            
            classes[class_name] = []
            
            properties = []
            for member in child.get('children', []):
                member_kind = member.get('kind')
                
                if member_kind == 1024:  # Property
                    prop_type_names = []
                    prop_type = member.get('type', {})
                    
                    # Extract type names based on the type structure
                    if prop_type.get('type') == 'intrinsic':
                        prop_type_names.append(prop_type.get('name', ''))
                    elif prop_type.get('type') == 'reference':
                        prop_type_names.append(prop_type.get('name', ''))
                    elif prop_type.get('type') == 'array':
                        element_type = prop_type.get('elementType', {}).get('name', '')
                        prop_type_names.append(f"Array.<{element_type}>")
                    
                    properties.append({
                        'name': member.get('name', ''),
                        'description': get_comment_text(member.get('comment', {})),
                        'type': {'names': prop_type_names}
                    })
                
                elif member_kind == 2048:  # Method
                    # Get the signature for the method
                    signatures = member.get('signatures', [])
                    if signatures:
                        signature = signatures[0]
                        
                        # Build parameters
                        params = []
                        for param in signature.get('parameters', []):
                            param_type_names = extract_type_names(param.get('type', {}))
                            
                            params.append({
                                'name': param.get('name', ''),
                                'description': get_comment_text(param.get('comment', {})),
                                'type': {'names': param_type_names},
                                'optional': param.get('flags', {}).get('isOptional', False)
                            })
                        
                        # Build return type
                        returns = []
                        if 'type' in signature:
                            return_type_names = extract_type_names(signature.get('type', {}))
                            return_description = get_comment_tag(signature.get('comment', {}), '@returns')
                            
                            returns.append({
                                'description': return_description,
                                'type': {'names': return_type_names}
                            })
                        
                        # Extract enhanced comment information
                        comment = signature.get('comment', {})
                        examples = get_all_comment_tags(comment, '@example')
                        throws = get_comment_tag(comment, '@throws')
                        see_also = process_see_references(comment)
                        
                        method_doclet = {
                            'kind': 'function',
                            'name': member.get('name', ''),
                            'description': get_comment_text(comment),
                            'memberof': class_name,
                            'params': params,
                            'returns': returns,
                            'examples': examples,  # Multiple examples
                            'throws': throws,
                            'see_also': see_also
                        }
                        
                        classes[class_name].append(method_doclet)
            
            class_item['properties'] = properties
            classes_props[class_name] = properties
    
    # Process classes
    for class_name, methods in classes.items():
        class_dir = os.path.join(root_dir, class_name)
        methods_dir = os.path.join(class_dir, 'Methods')
        os.makedirs(methods_dir, exist_ok=True)

        # Write class file
        class_content = generate_class_markdown(
            class_name, 
            methods, 
            classes_props[class_name], 
            enumerations, 
            classes
        )
        write_markdown_file(os.path.join(class_dir, f"{class_name}.md"), class_content)

        # Write method files
        for method in methods:
            method_file_path = os.path.join(methods_dir, f"{method['name']}.md")
            method_content = generate_method_markdown(method, enumerations, classes, example_root_name)
            write_markdown_file(method_file_path, method_content)

            # Check if method has examples (support both old and new format)
            has_examples = bool(method.get('examples', [])) or bool(method.get('example', ''))
            if not has_examples:
                missing_examples.append(os.path.relpath(method_file_path, output_dir))

    # Process enumerations
    enum_dir = os.path.join(root_dir, 'Enumeration')
    os.makedirs(enum_dir, exist_ok=True)

    for enum in enumerations:
        enum_file_path = os.path.join(enum_dir, f"{enum['name']}.md")
        enum_content = generate_enumeration_markdown(enum, enumerations, classes, example_root_name)
        if enum_content is None:
            continue

        write_markdown_file(enum_file_path, enum_content)        

# Helper functions for TypeDoc format
def get_comment_text(comment):
    """Extract text from a TypeDoc comment object with rich formatting support."""
    if not comment:
        return None
        
    summary = comment.get('summary', [])
    text_parts = []
    
    for part in summary:
        if part.get('kind') == 'text':
            text_parts.append(part.get('text', ''))
        elif part.get('kind') == 'code':
            # Handle inline code blocks
            text_parts.append(f"`{part.get('text', '')}`")
    
    # Join parts and clean up excessive whitespace while preserving intentional line breaks
    result = ''.join(text_parts)
    # Normalize line breaks but preserve paragraph breaks
    result = re.sub(r'\r\n|\r|\n', '\n', result)
    result = re.sub(r'\n{3,}', '\n\n', result)  # Max 2 consecutive newlines
    result = result.strip()
    
    return result if result else None

def get_comment_tag(comment, tag_name):
    """Extract content from a specific tag in a TypeDoc comment with rich formatting."""
    if not comment:
        return ''
        
    block_tags = comment.get('blockTags', [])
    
    for tag in block_tags:
        if tag.get('tag') == tag_name:
            content = tag.get('content', [])
            return process_comment_content(content)
    
    return ''

def get_all_comment_tags(comment, tag_name):
    """Extract all instances of a specific tag from a TypeDoc comment."""
    if not comment:
        return []
        
    block_tags = comment.get('blockTags', [])
    results = []
    
    for tag in block_tags:
        if tag.get('tag') == tag_name:
            content = tag.get('content', [])
            results.append(process_comment_content(content))
    
    return results

def process_comment_content(content):
    """Process TypeDoc comment content with support for various kinds."""
    if not content:
        return ''
    
    text_parts = []
    
    for part in content:
        kind = part.get('kind')
        
        if kind == 'text':
            text_parts.append(part.get('text', ''))
        elif kind == 'code':
            # Handle code blocks - preserve the exact formatting
            code_text = part.get('text', '')
            if code_text.strip().startswith('```'):
                # Already formatted code block
                text_parts.append(code_text)
            else:
                # Wrap in code block
                text_parts.append(f'```typescript\n{code_text}\n```')
        elif kind == 'inline-tag':
            # Handle {@link} and other inline tags
            tag_name = part.get('tag')
            tag_text = part.get('text', '')
            target = part.get('target')
            
            if tag_name == '@link':
                if target:
                    # This is a cross-reference link
                    text_parts.append(f'[{tag_text}]')  # We'll enhance this later
                else:
                    text_parts.append(tag_text)
            else:
                text_parts.append(tag_text)
    
    # Join and clean up formatting
    result = ''.join(text_parts)
    result = re.sub(r'\r\n|\r|\n', '\n', result)
    result = re.sub(r'\n{3,}', '\n\n', result)
    result = result.strip()
    
    return result

def process_see_references(comment):
    """Extract and format @see references with cross-links."""
    if not comment:
        return ''
        
    block_tags = comment.get('blockTags', [])
    see_parts = []
    
    for tag in block_tags:
        if tag.get('tag') == '@see':
            content = tag.get('content', [])
            see_text = process_see_content(content)
            if see_text:
                see_parts.append(see_text)
    
    if see_parts:
        return '\n\n## See Also\n\n' + '\n'.join(f'- {part}' for part in see_parts)
    
    return ''

def process_see_content(content):
    """Process @see tag content with link resolution."""
    if not content:
        return ''
    
    text_parts = []
    
    for part in content:
        kind = part.get('kind')
        
        if kind == 'text':
            text_parts.append(part.get('text', ''))
        elif kind == 'inline-tag':
            tag_name = part.get('tag')
            tag_text = part.get('text', '')
            
            if tag_name == '@link':
                # Create a proper markdown link
                text_parts.append(f'[{tag_text}](../Methods/{tag_text}.md)')
            else:
                text_parts.append(tag_text)
    
    return ''.join(text_parts).strip()

def extract_type_names(type_obj):
    """Extract type names from a TypeDoc type object."""
    type_names = []
    
    if not type_obj:
        return type_names
        
    type_kind = type_obj.get('type')
    
    if type_kind == 'intrinsic':
        type_names.append(type_obj.get('name', ''))
    elif type_kind == 'reference':
        type_names.append(type_obj.get('name', ''))
    elif type_kind == 'array':
        element_type = type_obj.get('elementType', {})
        element_name = extract_type_names(element_type)[0] if extract_type_names(element_type) else 'any'
        type_names.append(f"Array.<{element_name}>")
    elif type_kind == 'union':
        for union_type in type_obj.get('types', []):
            type_names.extend(extract_type_names(union_type))
    elif type_kind == 'literal':
        type_names.append(str(type_obj.get('value', '')))
    
    return type_names

def generate(output_path=None):
    print('Generating Markdown documentation...')
    
    if output_path is None:
        output_path = "./docs/markdown"
    
    if os.path.exists(output_path):
        print(f"Cleaning up existing files in: {output_path}")
        try:
            for item in os.listdir(output_path):
                item_path = os.path.join(output_path, item)
                if os.path.isdir(item_path):
                    shutil.rmtree(item_path)
                else:
                    os.remove(item_path)
        except Exception as e:
            print(f"Error cleaning up directory: {e}")
    
    os.makedirs(output_path, exist_ok=True)
    
    try:
        json_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'docs', 'docspace-sdk-js.json')
        print(f"Loading documentation from: {json_path}")
        data = load_json(json_path)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"Error loading JSON file: {e}")
        return
    
    try:
        process_docs(data, output_path, "SDK")
        print(f"Documentation generated successfully in: {output_path}")
    except Exception as e:
        print(f"Error during documentation generation: {e}")
        import traceback
        traceback.print_exc()
    
    print('Done!')

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate markdown documentation from TypeDoc JSON")
    parser.add_argument(
        "-o", "--output", 
        help="Output directory for the generated documentation",
        default=None
    )
    args = parser.parse_args()
    
    generate(args.output)
    
    print("START_MISSING_EXAMPLES")
    print(",\n".join(missing_examples))
    print("END_MISSING_EXAMPLES")
