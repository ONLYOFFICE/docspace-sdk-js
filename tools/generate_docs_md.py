import os
import json
import re
import shutil
import argparse
import time

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
            if isinstance(example, dict):
                # New TypeDoc format
                example_content = process_comment_content(example.get('content', []))
                if example_content:
                    # Check if example already contains proper markdown formatting
                    if '```' in example_content:
                        content += f"{example_content}\n\n"
                    else:
                        # Wrap in code block if not already formatted
                        content += f"```typescript\n{example_content.strip()}\n```\n\n"
            elif isinstance(example, str) and example.strip():
                # Old string format
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

def process_interfaces(interfaces, enumerations, classes, root_dir, example_root_name):
    """
    Generate markdown files for interfaces.
    
    Args:
        interfaces: Dictionary of processed interface objects
        enumerations: List of enumeration objects
        classes: Dictionary of class objects
        root_dir: Root directory for documentation
        example_root_name: Name to use in code examples
    """
    if not interfaces:
        return
    
    # Create Interface directory
    interface_dir = os.path.join(root_dir, 'Interface')
    os.makedirs(interface_dir, exist_ok=True)

    # Generate markdown for each interface
    for interface_name, interface in interfaces.items():
        interface_content = generate_interface_markdown(interface, enumerations, classes, example_root_name)
        interface_file_path = os.path.join(interface_dir, f"{interface_name}.md")
        write_markdown_file(interface_file_path, interface_content)

def process_type_aliases(type_aliases, enumerations, classes, root_dir, example_root_name):
    """
    Generate markdown files for type aliases.
    
    Args:
        type_aliases: Dictionary of processed type alias objects
        enumerations: List of enumeration objects
        classes: Dictionary of class objects
        root_dir: Root directory for documentation
        example_root_name: Name to use in code examples
    """
    if not type_aliases:
        return
    
    # Create Types directory
    types_dir = os.path.join(root_dir, 'Types')
    os.makedirs(types_dir, exist_ok=True)

    # Generate markdown for each type alias
    for type_name, type_alias in type_aliases.items():
        type_content = generate_type_alias_markdown(type_alias, enumerations, classes, example_root_name)
        type_file_path = os.path.join(types_dir, f"{type_name}.md")
        write_markdown_file(type_file_path, type_content)

def process_enumerations(enumerations, classes, root_dir, example_root_name):
    """
    Generate markdown files for enumerations.
    
    Args:
        enumerations: List of enumeration objects
        classes: Dictionary of class objects
        root_dir: Root directory for documentation
        example_root_name: Name to use in code examples
    """
    if not enumerations:
        return
    
    # Create Enumeration directory
    enum_dir = os.path.join(root_dir, 'Enumeration')
    os.makedirs(enum_dir, exist_ok=True)

    # Generate markdown for each enumeration
    for enum in enumerations:
        enum_name = enum.get('name', '')
        if not enum_name:
            continue
            
        enum_content = generate_enumeration_markdown(enum, enumerations, classes, example_root_name)
        if enum_content:  # Skip empty enums
            enum_file_path = os.path.join(enum_dir, f"{enum_name}.md")
            write_markdown_file(enum_file_path, enum_content)

def process_namespaces(namespaces, enumerations, classes, root_dir, example_root_name):
    """
    Generate markdown files for namespaces.
    
    Args:
        namespaces: Dictionary of processed namespace objects
        enumerations: List of enumeration objects
        classes: Dictionary of class objects
        root_dir: Root directory for documentation
        example_root_name: Name to use in code examples
    """
    if not namespaces:
        return
    
    # Create Namespace directory
    namespace_dir = os.path.join(root_dir, 'Namespace')
    os.makedirs(namespace_dir, exist_ok=True)

    # Generate markdown for each namespace
    for namespace_name, namespace in namespaces.items():
        namespace_content = generate_namespace_markdown(namespace, enumerations, classes, example_root_name)
        namespace_file_path = os.path.join(namespace_dir, f"{namespace_name}.md")
        write_markdown_file(namespace_file_path, namespace_content)

def process_docs(data, output_dir, root_name):
    """
    Process TypeDoc JSON data and generate markdown documentation.
    
    This function:
    - Extracts classes, interfaces, enums, and other types
    - Processes methods, properties, and other members
    - Generates markdown files for all documentation elements
    - Organizes them in a structured directory layout
    
    Args:
        data: The parsed TypeDoc JSON data
        output_dir: Output directory for markdown files
        root_name: Root directory name for documentation
    """
    # Data structures for storing extracted information
    classes = {}  # Maps class names to their methods
    classes_props = {}  # Maps class names to their properties
    interfaces = {}  # Maps interface names to their properties/methods
    type_aliases = {}  # Maps type alias names to their definitions
    enumerations = []  # List of enumeration types
    namespaces = {}  # Maps namespace names to their content
    
    # Initialize type cache for performance optimization
    type_cache = {}  # Cache for extracted type information
    
    # Create root directory
    root_dir = os.path.join(output_dir, root_name)
    example_root_name = 'example-sdk'
    
    print(f"Starting documentation processing for {len(data.get('children', []))} elements")
    
    # First pass: extract all type information
    for child in data.get('children', []):
        kind = child.get('kind')
        name = child.get('name', '')
        
        # Skip elements without names
        if not name:
            continue
        
        # Process based on element kind
        try:
            if kind == 8:  # Enum
                process_enum(child, enumerations)
            elif kind == 128:  # Class
                process_class(child, classes, classes_props, type_cache)
            elif kind == 256:  # Interface 
                process_interface(child, interfaces, type_cache)
            elif kind == 2097152:  # Type alias
                process_type_alias(child, type_aliases, type_cache)
            elif kind == 2:  # Module/Namespace
                process_namespace(child, namespaces, type_cache)
        except Exception as e:
            print(f"Error processing element {name} (kind: {kind}): {e}")
            import traceback
            traceback.print_exc()
    
    print(f"Extracted: {len(classes)} classes, {len(interfaces)} interfaces, {len(type_aliases)} type_aliases, {len(enumerations)} enums")
    
    # Process classes
    process_classes(classes, classes_props, enumerations, classes, root_dir, example_root_name, output_dir)
    
    # Process interfaces
    if interfaces:
        process_interfaces(interfaces, enumerations, classes, root_dir, example_root_name)
    
    # Process type aliases
    if type_aliases:
        process_type_aliases(type_aliases, enumerations, classes, root_dir, example_root_name)
    
    # Process enumerations
    process_enumerations(enumerations, classes, root_dir, example_root_name)
    
    # Process namespaces
    if namespaces:
        process_namespaces(namespaces, enumerations, classes, root_dir, example_root_name)
    
    # Generate index file for better navigation
    generate_index_file(classes, interfaces, enumerations, type_aliases, namespaces, root_dir)
    
    print(f"Documentation processing complete")

def process_enum(enum_data, enumerations):
    """Process an enumeration type from TypeDoc data."""
    item = {
        'kind': 'typedef',
        'name': enum_data.get('name', ''),
        'description': get_comment_text(enum_data.get('comment', {})),
        'type': {
            'names': [],
            'parsedType': {'type': 'TypeUnion'}
        },
        'properties': []
    }
    
    for enum_member in enum_data.get('children', []):
        enum_value = enum_member.get('type', {}).get('value')
        if enum_value is not None:  # Check for None explicitly as 0 is a valid enum value
            item['type']['names'].append(enum_value)
        
        item['properties'].append({
            'name': enum_member.get('name', ''),
            'description': get_comment_text(enum_member.get('comment', {})),
            'type': {'names': [enum_value] if enum_value is not None else []}
        })
    
    enumerations.append(item)

def process_class(class_data, classes, classes_props, type_cache):
    """Process a class from TypeDoc data."""
    class_name = class_data.get('name', '')
    
    # Skip if class name is empty
    if not class_name:
        return
    
    class_item = {
        'kind': 'class',
        'name': class_name,
        'description': get_comment_text(class_data.get('comment', {})),
        'properties': []
    }
    
    classes[class_name] = []
    
    # Process class members
    properties = []
    for member in class_data.get('children', []):
        member_kind = member.get('kind')
        
        try:
            if member_kind == 1024:  # Property
                process_property(member, properties, type_cache)
            
            elif member_kind == 2048:  # Method
                process_method(member, classes, class_name, type_cache)
            
            elif member_kind == 512:  # Constructor
                process_constructor(member, classes, class_name, type_cache)
                
            elif member_kind == 262144:  # Accessor (getter/setter)
                process_accessor(member, properties, type_cache)
        except Exception as e:
            print(f"Error processing class member {member.get('name', '')} in {class_name}: {e}")
    
    class_item['properties'] = properties
    classes_props[class_name] = properties

def process_property(property_data, properties_list, type_cache):
    """Process a property from TypeDoc data."""
    prop_name = property_data.get('name', '')
    prop_type = property_data.get('type', {})
    
    # Extract type names with caching for better performance
    type_key = str(prop_type)
    if type_key in type_cache:
        prop_type_names = type_cache[type_key]
    else:
        prop_type_names = extract_type_names(prop_type)
        type_cache[type_key] = prop_type_names
    
    properties_list.append({
        'name': prop_name,
        'description': get_comment_text(property_data.get('comment', {})),
        'type': {'names': prop_type_names}
    })

def process_method(method_data, classes_dict, class_name, type_cache):
    """Process a method from TypeDoc data."""
    # Get all signatures for overloaded methods
    signatures = method_data.get('signatures', [])
    if not signatures:
        return
    
    # Use the first signature as the primary one
    signature = signatures[0]
    method_name = method_data.get('name', '')
    
    # Build parameters with type caching
    params = []
    for param in signature.get('parameters', []):
        param_type = param.get('type', {})
        
        # Use cache for parameter types
        type_key = str(param_type)
        if type_key in type_cache:
            param_type_names = type_cache[type_key]
        else:
            param_type_names = extract_type_names(param_type)
            type_cache[type_key] = param_type_names
        
        params.append({
            'name': param.get('name', ''),
            'description': get_comment_text(param.get('comment', {})),
            'type': {'names': param_type_names},
            'optional': param.get('flags', {}).get('isOptional', False),
            'defaultvalue': get_default_value(param)
        })
    
    # Extract return type with caching
    returns = []
    if 'type' in signature:
        return_type = signature.get('type', {})
        
        # Use cache for return types
        type_key = str(return_type)
        if type_key in type_cache:
            return_type_names = type_cache[type_key]
        else:
            return_type_names = extract_type_names(return_type)
            type_cache[type_key] = return_type_names
        
        return_description = get_comment_tag(signature.get('comment', {}), '@returns')
        
        returns.append({
            'description': return_description,
            'type': {'names': return_type_names}
        })
    
    # Extract comment information
    comment = signature.get('comment', {})
    examples = get_all_comment_tags(comment, '@example')
    throws = get_comment_tag(comment, '@throws')
    see_also = process_see_references(comment)
    
    # Create method doclet
    method_doclet = {
        'kind': 'function',
        'name': method_name,
        'description': get_comment_text(comment),
        'memberof': class_name,
        'params': params,
        'returns': returns,
        'examples': examples,
        'throws': throws,
        'see_also': see_also
    }
    
    # Add method to class
    classes_dict[class_name].append(method_doclet)

def process_constructor(constructor_data, classes_dict, class_name, type_cache):
    """Process a constructor from TypeDoc data."""
    # Constructors are similar to methods but with special handling
    signatures = constructor_data.get('signatures', [])
    if not signatures:
        return
    
    # Use the first signature
    signature = signatures[0]
    
    # Build parameters
    params = []
    for param in signature.get('parameters', []):
        param_type = param.get('type', {})
        
        # Use cache for parameter types
        type_key = str(param_type)
        if type_key in type_cache:
            param_type_names = type_cache[type_key]
        else:
            param_type_names = extract_type_names(param_type)
            type_cache[type_key] = param_type_names
        
        params.append({
            'name': param.get('name', ''),
            'description': get_comment_text(param.get('comment', {})),
            'type': {'names': param_type_names},
            'optional': param.get('flags', {}).get('isOptional', False)
        })
    
    # Extract comment information
    comment = signature.get('comment', {})
    examples = get_all_comment_tags(comment, '@example')
    
    # Create constructor doclet
    constructor_doclet = {
        'kind': 'function',
        'name': 'constructor',
        'description': get_comment_text(comment),
        'memberof': class_name,
        'params': params,
        'returns': [],  # Constructors don't have return types
        'examples': examples
    }
    
    # Add constructor to class
    classes_dict[class_name].append(constructor_doclet)

def process_accessor(accessor_data, properties_list, type_cache):
    """Process a getter/setter accessors from TypeDoc data."""
    accessor_name = accessor_data.get('name', '')
    
    # Check for getter
    get_signature = None
    for getter in accessor_data.get('getSignature', []):
        get_signature = getter
        break
    
    # Check for setter
    set_signature = None
    for setter in accessor_data.get('setSignature', []):
        set_signature = setter
        break
    
    # Use getter for type information if available
    if get_signature:
        prop_type = get_signature.get('type', {})
        comment = get_signature.get('comment', {})
    elif set_signature:
        # Use setter's parameter type if no getter
        parameters = set_signature.get('parameters', [])
        prop_type = parameters[0].get('type', {}) if parameters else {}
        comment = set_signature.get('comment', {})
    else:
        return
    
    # Extract type names with caching
    type_key = str(prop_type)
    if type_key in type_cache:
        prop_type_names = type_cache[type_key]
    else:
        prop_type_names = extract_type_names(prop_type)
        type_cache[type_key] = prop_type_names
    
    # Add as a property
    properties_list.append({
        'name': accessor_name,
        'description': get_comment_text(comment),
        'type': {'names': prop_type_names}
    })

def process_interface(interface_data, interfaces, type_cache):
    """
    Process an interface from TypeDoc data.
    
    Args:
        interface_data: Interface data from TypeDoc JSON
        interfaces: Dictionary to store processed interfaces
        type_cache: Cache for type extraction
    """
    interface_name = interface_data.get('name', '')
    
    # Skip if interface name is empty
    if not interface_name:
        return
    
    # Create interface item
    interface_item = {
        'kind': 'interface',
        'name': interface_name,
        'description': get_comment_text(interface_data.get('comment', {})),
        'properties': [],
        'methods': []
    }
    
    # Process extensions (interfaces this one extends)
    extensions = []
    for ext_type in interface_data.get('extendedTypes', []):
        ext_names = extract_type_names(ext_type)
        if ext_names:
            extensions.extend(ext_names)
    
    interface_item['extends'] = extensions
    
    # Process interface members
    for member in interface_data.get('children', []):
        member_kind = member.get('kind')
        
        try:
            if member_kind == 1024:  # Property
                # Process property
                prop_name = member.get('name', '')
                prop_type = member.get('type', {})
                
                # Extract type names with caching for better performance
                type_key = str(prop_type)
                if type_key in type_cache:
                    prop_type_names = type_cache[type_key]
                else:
                    prop_type_names = extract_type_names(prop_type)
                    type_cache[type_key] = prop_type_names
                
                interface_item['properties'].append({
                    'name': prop_name,
                    'description': get_comment_text(member.get('comment', {})),
                    'type': {'names': prop_type_names},
                    'optional': member.get('flags', {}).get('isOptional', False)
                })
                
            elif member_kind == 2048:  # Method
                # Process method
                signatures = member.get('signatures', [])
                if not signatures:
                    continue
                
                # Use the first signature
                signature = signatures[0]
                method_name = member.get('name', '')
                
                # Build parameters
                params = []
                for param in signature.get('parameters', []):
                    param_type = param.get('type', {})
                    
                    # Use cache for parameter types
                    type_key = str(param_type)
                    if type_key in type_cache:
                        param_type_names = type_cache[type_key]
                    else:
                        param_type_names = extract_type_names(param_type)
                        type_cache[type_key] = param_type_names
                    
                    params.append({
                        'name': param.get('name', ''),
                        'description': get_comment_text(param.get('comment', {})),
                        'type': {'names': param_type_names},
                        'optional': param.get('flags', {}).get('isOptional', False)
                    })
                
                # Extract return type
                returns = []
                if 'type' in signature:
                    return_type = signature.get('type', {})
                    
                    # Use cache for return types
                    type_key = str(return_type)
                    if type_key in type_cache:
                        return_type_names = type_cache[type_key]
                    else:
                        return_type_names = extract_type_names(return_type)
                        type_cache[type_key] = return_type_names
                    
                    return_description = get_comment_tag(signature.get('comment', {}), '@returns')
                    
                    returns.append({
                        'description': return_description,
                        'type': {'names': return_type_names}
                    })
                
                # Extract comment information
                comment = signature.get('comment', {})
                examples = get_all_comment_tags(comment, '@example')
                
                # Create method object
                method_obj = {
                    'name': method_name,
                    'description': get_comment_text(comment),
                    'params': params,
                    'returns': returns,
                    'examples': examples,
                    'optional': member.get('flags', {}).get('isOptional', False)
                }
                
                interface_item['methods'].append(method_obj)
                
            elif member_kind == 262144:  # Accessor (getter/setter)
                # Process accessor as property
                accessor_name = member.get('name', '')
                
                # Check for getter
                get_signature = None
                for getter in member.get('getSignature', []):
                    get_signature = getter
                    break
                
                # Check for setter
                set_signature = None
                for setter in member.get('setSignature', []):
                    set_signature = setter
                    break
                
                # Use getter for type information if available
                if get_signature:
                    prop_type = get_signature.get('type', {})
                    comment = get_signature.get('comment', {})
                elif set_signature:
                    # Use setter's parameter type if no getter
                    parameters = set_signature.get('parameters', [])
                    prop_type = parameters[0].get('type', {}) if parameters else {}
                    comment = set_signature.get('comment', {})
                else:
                    continue
                
                # Extract type names with caching
                type_key = str(prop_type)
                if type_key in type_cache:
                    prop_type_names = type_cache[type_key]
                else:
                    prop_type_names = extract_type_names(prop_type)
                    type_cache[type_key] = prop_type_names
                
                # Add as a property
                interface_item['properties'].append({
                    'name': accessor_name,
                    'description': get_comment_text(comment),
                    'type': {'names': prop_type_names},
                    'optional': member.get('flags', {}).get('isOptional', False)
                })
                
        except Exception as e:
            print(f"Error processing interface member {member.get('name', '')} in {interface_name}: {e}")
    
    # Store the interface
    interfaces[interface_name] = interface_item

def process_type_alias(type_alias_data, type_aliases, type_cache):
    """
    Process a type alias from TypeDoc data.
    
    Args:
        type_alias_data: Type alias data from TypeDoc JSON
        type_aliases: Dictionary to store processed type aliases
        type_cache: Cache for type extraction
    """
    type_name = type_alias_data.get('name', '')
    
    # Skip if type name is empty
    if not type_name:
        return
    
    # Extract the type that this alias refers to
    type_obj = type_alias_data.get('type', {})
    
    # Use cache for type extraction
    type_key = str(type_obj)
    if type_key in type_cache:
        type_names = type_cache[type_key]
    else:
        type_names = extract_type_names(type_obj)
        type_cache[type_key] = type_names
    
    # Create type alias item
    type_alias_item = {
        'kind': 'typedef',
        'name': type_name,
        'description': get_comment_text(type_alias_data.get('comment', {})),
        'type': {'names': type_names}
    }
    
    # Check if it's a complex type with type parameters (generics)
    type_parameters = []
    for param in type_alias_data.get('typeParameters', []):
        param_name = param.get('name', '')
        if param_name:
            # Get constraint if any (extends clause)
            constraint = None
            if 'constraint' in param:
                constraint_names = extract_type_names(param.get('constraint', {}))
                if constraint_names:
                    constraint = constraint_names[0]
            
            # Get default if any
            default_value = None
            if 'default' in param:
                default_names = extract_type_names(param.get('default', {}))
                if default_names:
                    default_value = default_names[0]
            
            type_parameters.append({
                'name': param_name,
                'constraint': constraint,
                'default': default_value
            })
    
    # Add type parameters if any
    if type_parameters:
        type_alias_item['typeParameters'] = type_parameters
    
    # Store the type alias
    type_aliases[type_name] = type_alias_item

def process_namespace(namespace_data, namespaces, type_cache):
    """
    Process a namespace from TypeDoc data.
    
    Args:
        namespace_data: Namespace data from TypeDoc JSON
        namespaces: Dictionary to store processed namespaces
        type_cache: Cache for type extraction
    """
    namespace_name = namespace_data.get('name', '')
    
    # Skip if namespace name is empty
    if not namespace_name:
        return
    
    # Create namespace item
    namespace_item = {
        'kind': 'namespace',
        'name': namespace_name,
        'description': get_comment_text(namespace_data.get('comment', {})),
        'classes': {},
        'interfaces': {},
        'functions': [],
        'variables': [],
        'typeAliases': {},
        'enums': []
    }
    
    # Process namespace children
    for child in namespace_data.get('children', []):
        child_kind = child.get('kind')
        child_name = child.get('name', '')
        
        if not child_name:
            continue
        
        try:
            if child_kind == 128:  # Class
                # Create a sub-cache for this class
                class_cache = {}
                
                # Process the class
                namespace_item['classes'][child_name] = {
                    'name': child_name,
                    'description': get_comment_text(child.get('comment', {})),
                    'properties': [],
                    'methods': []
                }
                
                # Process class members
                for member in child.get('children', []):
                    member_kind = member.get('kind')
                    
                    if member_kind == 1024:  # Property
                        process_property(member, namespace_item['classes'][child_name]['properties'], class_cache)
                    elif member_kind == 2048:  # Method
                        # Simplified method processing for namespace context
                        signatures = member.get('signatures', [])
                        if signatures:
                            signature = signatures[0]
                            method_name = member.get('name', '')
                            
                            namespace_item['classes'][child_name]['methods'].append({
                                'name': method_name,
                                'description': get_comment_text(signature.get('comment', {}))
                            })
            
            elif child_kind == 256:  # Interface
                # Create interface in namespace
                namespace_item['interfaces'][child_name] = {
                    'name': child_name,
                    'description': get_comment_text(child.get('comment', {}))
                }
            
            elif child_kind == 4194304:  # Type Alias
                # Extract the type
                type_obj = child.get('type', {})
                type_names = extract_type_names(type_obj)
                
                # Add to namespace
                namespace_item['typeAliases'][child_name] = {
                    'name': child_name,
                    'description': get_comment_text(child.get('comment', {})),
                    'type': {'names': type_names}
                }
            
            elif child_kind == 8:  # Enum
                # Process enum in namespace
                enum_item = {
                    'name': child_name,
                    'description': get_comment_text(child.get('comment', {})),
                    'members': []
                }
                
                # Process enum members
                for enum_member in child.get('children', []):
                    enum_value = enum_member.get('type', {}).get('value')
                    enum_item['members'].append({
                        'name': enum_member.get('name', ''),
                        'value': enum_value,
                        'description': get_comment_text(enum_member.get('comment', {}))
                    })
                
                namespace_item['enums'].append(enum_item)
            
            elif child_kind == 64:  # Function
                # Process function in namespace
                signatures = child.get('signatures', [])
                if signatures:
                    signature = signatures[0]
                    
                    namespace_item['functions'].append({
                        'name': child_name,
                        'description': get_comment_text(signature.get('comment', {}))
                    })
            
            elif child_kind == 32:  # Variable
                # Process variable in namespace
                var_type = child.get('type', {})
                type_names = extract_type_names(var_type)
                
                namespace_item['variables'].append({
                    'name': child_name,
                    'description': get_comment_text(child.get('comment', {})),
                    'type': {'names': type_names}
                })
                
        except Exception as e:
            print(f"Error processing namespace member {child_name} in {namespace_name}: {e}")
    
    # Store the namespace
    namespaces[namespace_name] = namespace_item

def get_default_value(param_data):
    """Extract default value from parameter data."""
    if 'defaultValue' in param_data:
        return param_data.get('defaultValue')
    
    # Handle TypeDoc's alternative formats
    if param_data.get('default', False):
        if 'value' in param_data:
            return param_data.get('value')
    
    return None

def process_classes(classes, classes_props, enumerations, all_classes, root_dir, example_root_name, output_dir):
    """Generate markdown files for classes."""
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
            all_classes
        )
        write_markdown_file(os.path.join(class_dir, f"{class_name}.md"), class_content)

        # Write method files
        for method in methods:
            method_file_path = os.path.join(methods_dir, f"{method['name']}.md")
            method_content = generate_method_markdown(method, enumerations, all_classes, example_root_name)
            write_markdown_file(method_file_path, method_content)

            # Track methods without examples
            has_examples = bool(method.get('examples', [])) or bool(method.get('example', ''))
            if not has_examples:
                missing_examples.append(os.path.relpath(method_file_path, output_dir))

def generate_interface_markdown(interface, enumerations, classes, example_root_name):
    """
    Generate markdown documentation for an interface.
    
    Args:
        interface: Interface object to document
        enumerations: List of enumeration objects for reference linking
        classes: Dictionary of class objects for reference linking
        example_root_name: Name to use in code examples
        
    Returns:
        str: Markdown content for the interface
    """
    interface_name = interface.get('name', '')
    description = interface.get('description', 'No description provided.')
    description = correct_description(description)
    
    # Start with the interface header and description
    content = f"# {interface_name}\n\n{description}\n\n"
    
    # Add extends information if available
    extends = interface.get('extends', [])
    if extends:
        content += "## Extends\n\n"
        for ext in extends:
            content += f"- {ext}\n"
        content += "\n"
    
    # Add properties section if there are properties
    properties = interface.get('properties', [])
    if properties:
        content += "## Properties\n\n"
        content += "| Name | Type | Optional | Description |\n"
        content += "| ---- | ---- | -------- | ----------- |\n"
        
        for prop in properties:
            prop_name = prop.get('name', '')
            prop_types = prop.get('type', {}).get('names', [])
            prop_type_md = generate_data_types_markdown(prop_types, enumerations, classes)
            prop_description = remove_line_breaks(correct_description(prop.get('description', 'No description provided.')))
            prop_optional = "Yes" if prop.get('optional', False) else "No"
            
            content += f"| {prop_name} | {prop_type_md} | {prop_optional} | {prop_description} |\n"
        
        content += "\n"
    
    # Add methods section if there are methods
    methods = interface.get('methods', [])
    if methods:
        content += "## Methods\n\n"
        
        for method in methods:
            method_name = method.get('name', '')
            method_description = correct_description(method.get('description', 'No description provided.'))
            
            # Method signature
            params = method.get('params', [])
            param_list = ', '.join([f"{p.get('name', '')}: {' | '.join(p.get('type', {}).get('names', ['any']))}" for p in params])
            
            # Return type
            returns = method.get('returns', [])
            return_type = "void"
            if returns:
                return_types = returns[0].get('type', {}).get('names', [])
                if return_types:
                    return_type = ' | '.join(return_types)
            
            # Add method signature
            content += f"### {method_name}\n\n"
            content += f"{method_description}\n\n"
            content += f"**Signature:** `{method_name}({param_list}): {return_type}`\n\n"
            
            # Add parameters if any
            if params:
                content += "**Parameters:**\n\n"
                content += "| Name | Type | Optional | Description |\n"
                content += "| ---- | ---- | -------- | ----------- |\n"
                
                for param in params:
                    param_name = param.get('name', '')
                    param_types = param.get('type', {}).get('names', [])
                    param_type_md = generate_data_types_markdown(param_types, enumerations, classes)
                    param_description = remove_line_breaks(correct_description(param.get('description', 'No description provided.')))
                    param_optional = "Yes" if param.get('optional', False) else "No"
                    
                    content += f"| {param_name} | {param_type_md} | {param_optional} | {param_description} |\n"
                
                content += "\n"
            
            # Add return type info if available
            if returns and return_type != "void":
                return_description = correct_description(returns[0].get('description', ''))
                if return_description:
                    content += f"**Returns:** {return_description}\n\n"
            
            # Add examples if available
            examples = method.get('examples', [])
            if examples:
                content += "**Examples:**\n\n"
                for example in examples:
                    if isinstance(example, str) and example.strip():
                        # Check if example already contains proper markdown formatting
                        if '```' in example:
                            content += f"{example}\n\n"
                        else:
                            # Wrap in code block if not already formatted
                            content += f"```typescript\n{example.strip()}\n```\n\n"
            
            content += "\n"
    
    return escape_text_outside_code_blocks(content)

def generate_type_alias_markdown(type_alias, enumerations, classes, example_root_name):
    """
    Generate markdown documentation for a type alias.
    
    Args:
        type_alias: Type alias object to document
        enumerations: List of enumeration objects for reference linking
        classes: Dictionary of class objects for reference linking
        example_root_name: Name to use in code examples
        
    Returns:
        str: Markdown content for the type alias
    """
    type_name = type_alias.get('name', '')
    description = type_alias.get('description', 'No description provided.')
    description = correct_description(description)
    type_names = type_alias.get('type', {}).get('names', [])
    
    # Start with the type header and description
    content = f"# {type_name}\n\n{description}\n\n"
    
    # Add type parameters if any (for generic types)
    type_parameters = type_alias.get('typeParameters', [])
    if type_parameters:
        content += "## Type Parameters\n\n"
        content += "| Name | Constraint | Default |\n"
        content += "| ---- | ---------- | ------- |\n"
        
        for param in type_parameters:
            param_name = param.get('name', '')
            param_constraint = param.get('constraint', '')
            param_default = param.get('default', '')
            
            content += f"| {param_name} | {param_constraint if param_constraint else ''} | {param_default if param_default else ''} |\n"
        
        content += "\n"
    content += "## Type Definition\n\n"
    type_md = generate_data_types_markdown(type_names, enumerations, classes)
    content += f"```typescript\ntype {type_name} = {type_md}\n```\n\n"
    
    # Add examples if available (rare for type aliases, but possible)
    examples = type_alias.get('examples', [])
    if examples:
        content += "## Examples\n\n"
        for example in examples:
            if isinstance(example, str) and example.strip():
                # Check if example already contains proper markdown formatting
                if '```' in example:
                    content += f"{example}\n\n"
                else:
                    # Wrap in code block if not already formatted
                    content += f"```typescript\n{example.strip()}\n```\n\n"
    
    return escape_text_outside_code_blocks(content)

def generate_namespace_markdown(namespace, enumerations, classes, example_root_name):
    """
    Generate markdown documentation for a namespace.
    
    Args:
        namespace: Namespace object to document
        enumerations: List of enumeration objects for reference linking
        classes: Dictionary of class objects for reference linking
        example_root_name: Name to use in code examples
        
    Returns:
        str: Markdown content for the namespace
    """
    namespace_name = namespace.get('name', '')
    description = namespace.get('description', 'No description provided.')
    description = correct_description(description)
    
    # Start with the namespace header and description
    content = f"# {namespace_name} Namespace\n\n{description}\n\n"
    
    # Add classes section
    namespace_classes = namespace.get('classes', {})
    if namespace_classes:
        content += "## Classes\n\n"
        for class_name, class_obj in namespace_classes.items():
            class_description = correct_description(class_obj.get('description', ''))
            content += f"### {class_name}\n\n"
            content += f"{class_description}\n\n"
            
            # Link to full class docs if applicable
            if class_name in classes:
                content += f"[View detailed documentation]({class_name}/{class_name}.md)\n\n"
    
    # Add interfaces section
    interfaces = namespace.get('interfaces', {})
    if interfaces:
        content += "## Interfaces\n\n"
        for interface_name, interface in interfaces.items():
            interface_description = correct_description(interface.get('description', ''))
            content += f"### {interface_name}\n\n"
            content += f"{interface_description}\n\n"
            
            # Link to full interface docs if applicable
            content += f"[View detailed documentation](../Interface/{interface_name}.md)\n\n"
    
    # Add type aliases section
    type_aliases = namespace.get('typeAliases', {})
    if type_aliases:
        content += "## Type Aliases\n\n"
        for type_name, type_alias in type_aliases.items():
            type_description = correct_description(type_alias.get('description', ''))
            content += f"### {type_name}\n\n"
            content += f"{type_description}\n\n"
            
            # Add type definition summary
            type_names = type_alias.get('type', {}).get('names', [])
            if type_names:
                type_md = generate_data_types_markdown(type_names, enumerations, classes)
                content += f"```typescript\ntype {type_name} = {type_md}\n```\n\n"
            
            # Link to full type docs if applicable
            content += f"[View detailed documentation](../Types/{type_name}.md)\n\n"
    
    # Add enumerations section
    enums = namespace.get('enums', [])
    if enums:
        content += "## Enumerations\n\n"
        for enum in enums:
            enum_name = enum.get('name', '')
            enum_description = correct_description(enum.get('description', ''))
            content += f"### {enum_name}\n\n"
            content += f"{enum_description}\n\n"
            
            # Add members summary
            members = enum.get('members', [])
            if members:
                content += "| Name | Value | Description |\n"
                content += "| ---- | ----- | ----------- |\n"
                
                for member in members:
                    member_name = member.get('name', '')
                    member_value = member.get('value', '')
                    member_description = remove_line_breaks(correct_description(member.get('description', 'No description provided.')))
                    
                    content += f"| {member_name} | {member_value} | {member_description} |\n"
                
                content += "\n"
            
            # Link to full enum docs if applicable
            content += f"[View detailed documentation](../Enumeration/{enum_name}.md)\n\n"
    
    # Add functions section
    functions = namespace.get('functions', [])
    if functions:
        content += "## Functions\n\n"
        for function in functions:
            function_name = function.get('name', '')
            function_description = correct_description(function.get('description', ''))
            content += f"### {function_name}\n\n"
            content += f"{function_description}\n\n"
    
    # Add variables section
    variables = namespace.get('variables', [])
    if variables:
        content += "## Variables\n\n"
        for variable in variables:
            var_name = variable.get('name', '')
            var_description = correct_description(variable.get('description', ''))
            var_types = variable.get('type', {}).get('names', [])
            var_type_md = generate_data_types_markdown(var_types, enumerations, classes)
            
            content += f"### {var_name}\n\n"
            content += f"{var_description}\n\n"
            content += f"**Type:** {var_type_md}\n\n"
    
    return escape_text_outside_code_blocks(content)

def generate_index_file(classes, interfaces, enumerations, type_aliases, namespaces, root_dir):
    """Generate an index file for the documentation."""
    index_content = "# API Reference\n\n"
    
    # Add classes
    if classes:
        index_content += "## Classes\n\n"
        for class_name in sorted(classes.keys()):
            index_content += f"- [{class_name}]({class_name}/{class_name}.md)\n"
        index_content += "\n"
    
    # Add interfaces
    if interfaces:
        index_content += "## Interfaces\n\n"
        for interface_name in sorted(interfaces.keys()):
            index_content += f"- [{interface_name}](Interface/{interface_name}.md)\n"
        index_content += "\n"
    
    # Add enumerations
    if enumerations:
        index_content += "## Enumerations\n\n"
        for enum in sorted(enumerations, key=lambda e: e.get('name', '')):
            enum_name = enum.get('name', '')
            if enum_name:
                index_content += f"- [{enum_name}](Enumeration/{enum_name}.md)\n"
        index_content += "\n"
    
    # Add type aliases
    if type_aliases:
        index_content += "## Type Aliases\n\n"
        for type_name in sorted(type_aliases.keys()):
            index_content += f"- [{type_name}](Types/{type_name}.md)\n"
        index_content += "\n"
    
    # Add namespaces
    if namespaces:
        index_content += "## Namespaces\n\n"
        for namespace_name in sorted(namespaces.keys()):
            index_content += f"- [{namespace_name}](Namespace/{namespace_name}.md)\n"
        index_content += "\n"
    
    # Write the index file
    write_markdown_file(os.path.join(root_dir, "index.md"), index_content)        

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

# Global cache for type extraction to avoid redundant processing
_TYPE_EXTRACTION_CACHE = {}

def extract_type_names(type_obj):
    """
    Extract type names from a TypeDoc type object.
    
    This function handles complex TypeScript types including:
    - Basic types (string, number, etc.)
    - Arrays and tuples
    - Union and intersection types
    - Generic types with type parameters
    - Indexed access types
    - Conditional types
    - Type operators
    
    Args:
        type_obj: TypeDoc type object
        
    Returns:
        list: List of extracted type names
    """
    global _TYPE_EXTRACTION_CACHE
    
    # Return empty list for empty type objects
    if not type_obj:
        return []
    
    # Use cache if available
    obj_id = str(hash(str(type_obj)))
    if obj_id in _TYPE_EXTRACTION_CACHE:
        return _TYPE_EXTRACTION_CACHE[obj_id].copy()  # Return copy to prevent modification
    
    type_names = []
    type_kind = type_obj.get('type')
    
    try:
        if type_kind == 'intrinsic':
            # Basic types like string, number, boolean
            type_names.append(type_obj.get('name', ''))
            
        elif type_kind == 'reference':
            # Named types like interfaces, classes, enums
            type_name = type_obj.get('name', '')
            
            # Handle generic types with type arguments
            if 'typeArguments' in type_obj and type_obj['typeArguments']:
                type_args = []
                for arg in type_obj['typeArguments']:
                    arg_types = extract_type_names(arg)
                    if arg_types:
                        type_args.append(arg_types[0])
                    else:
                        type_args.append('any')
                        
                # Format as Generic<T1, T2, ...>
                if type_args:
                    type_name += f"<{', '.join(type_args)}>"
            
            type_names.append(type_name)
            
        elif type_kind == 'array':
            # Array types like string[] or Array<string>
            element_type = type_obj.get('elementType', {})
            element_name = extract_type_names(element_type)[0] if extract_type_names(element_type) else 'any'
            type_names.append(f"Array.<{element_name}>")
            
        elif type_kind == 'union':
            # Union types like A | B | C
            union_parts = []
            for union_type in type_obj.get('types', []):
                union_parts.extend(extract_type_names(union_type))
                
            if union_parts:
                # Join union types with |
                type_names.append(' | '.join(union_parts))
            else:
                type_names.append('any')
                
        elif type_kind == 'intersection':
            # Intersection types like A & B & C
            intersection_parts = []
            for inter_type in type_obj.get('types', []):
                intersection_parts.extend(extract_type_names(inter_type))
                
            if intersection_parts:
                # Join intersection types with &
                type_names.append(' & '.join(intersection_parts))
            else:
                type_names.append('Object')
                
        elif type_kind == 'literal':
            # Literal types like "abc", 123, true
            value = type_obj.get('value')
            if isinstance(value, str):
                type_names.append(f'"{value}"')
            else:
                type_names.append(str(value) if value is not None else 'null')
                
        elif type_kind == 'reflection':
            # Object or function types defined inline
            if 'declaration' in type_obj:
                decl = type_obj['declaration']
                
                # Check if it's a function type
                if 'signatures' in decl and decl['signatures']:
                    sig = decl['signatures'][0]
                    
                    # Build parameter list
                    params = []
                    for param in sig.get('parameters', []):
                        param_type = extract_type_names(param.get('type', {}))
                        param_name = param.get('name', '')
                        param_str = f"{param_name}: {param_type[0] if param_type else 'any'}"
                        params.append(param_str)
                    
                    # Get return type
                    return_type = 'void'
                    if 'type' in sig:
                        ret_types = extract_type_names(sig['type'])
                        if ret_types:
                            return_type = ret_types[0]
                    
                    # Format function type
                    type_names.append(f"({', '.join(params)}) => {return_type}")
                else:
                    # Object type with properties
                    type_names.append('Object')
            else:
                type_names.append('Object')
                
        elif type_kind == 'typeOperator':
            # Type operators like keyof, readonly
            if 'target' in type_obj:
                target_names = extract_type_names(type_obj.get('target', {}))
                operator = type_obj.get('operator', '')
                
                if target_names:
                    for target in target_names:
                        type_names.append(f"{operator} {target}")
                else:
                    type_names.append(f"{operator} any")
                    
        elif type_kind == 'tuple':
            # Tuple types like [string, number]
            element_types = []
            for elem in type_obj.get('elements', []):
                elem_types = extract_type_names(elem)
                if elem_types:
                    element_types.append(elem_types[0])
                else:
                    element_types.append('any')
                    
            type_names.append(f"[{', '.join(element_types)}]")
            
        elif type_kind == 'indexedAccess':
            # Indexed access types like T[K]
            object_type = extract_type_names(type_obj.get('objectType', {}))
            index_type = extract_type_names(type_obj.get('indexType', {}))
            
            if object_type and index_type:
                type_names.append(f"{object_type[0]}[{index_type[0]}]")
            else:
                type_names.append('any')
                
        elif type_kind == 'query':
            # Query types like typeof T
            query_type = extract_type_names(type_obj.get('queryType', {}))
            if query_type:
                type_names.append(f"typeof {query_type[0]}")
            else:
                type_names.append('any')
                
        elif type_kind == 'conditional':
            # Conditional types like T extends U ? X : Y
            # For simplicity in documentation, just note it's a conditional type
            check_type = extract_type_names(type_obj.get('checkType', {}))
            extends_type = extract_type_names(type_obj.get('extendsType', {}))
            true_type = extract_type_names(type_obj.get('trueType', {}))
            false_type = extract_type_names(type_obj.get('falseType', {}))
            
            if all([check_type, extends_type, true_type, false_type]):
                condition = f"{check_type[0]} extends {extends_type[0]}"
                result = f"{true_type[0]} : {false_type[0]}"
                type_names.append(f"{condition} ? {result}")
            else:
                type_names.append('conditional')
                
        elif type_kind == 'mapped':
            # Mapped types like { [K in keyof T]: T[K] }
            type_names.append('Object')
            
        elif type_kind == 'template':
            # Template literal types like `foo${T}`
            type_names.append('string')
            
        elif type_kind == 'unknown' or type_kind == 'undefined':
            # Unknown or undefined types
            type_names.append(type_kind)
            
        else:
            # Default for unknown type kinds
            type_names.append('any')
    
    except Exception as e:
        print(f"Error extracting type: {e}")
        print(f"Type object: {type_obj}")
        type_names.append('any')
    
    # Cache the result before returning
    _TYPE_EXTRACTION_CACHE[obj_id] = type_names.copy()
    
    return type_names

def generate(output_path=None):
    """
    Generate markdown documentation from TypeDoc JSON.
    
    This function:
    1. Loads the JSON documentation data
    2. Creates necessary directory structure
    3. Processes classes, methods, enumerations, etc.
    4. Generates markdown files
    
    Args:
        output_path: Optional path to output directory. If None, uses './docs/markdown'
    
    Returns:
        bool: True if generation was successful, False otherwise
    """
    global _TYPE_EXTRACTION_CACHE
    _TYPE_EXTRACTION_CACHE = {}  # Initialize/reset the type cache
    
    print('=' * 80)
    print('Generating Markdown documentation...')
    print('=' * 80)
    
    # Start total execution timer
    total_start_time = time.time()
    
    # Set default output path if not provided
    if output_path is None:
        output_path = "./docs/markdown"
    
    # Clean up existing files
    if os.path.exists(output_path):
        print(f"Cleaning up existing files in: {output_path}")
        try:
            for item in os.listdir(output_path):
                item_path = os.path.join(output_path, item)
                if os.path.isdir(item_path):
                    shutil.rmtree(item_path)
                else:
                    os.remove(item_path)
            print("Cleanup complete")
        except Exception as e:
            print(f"Error cleaning up directory: {e}")
            print("Continuing with generation...")
    
    # Create output directory
    os.makedirs(output_path, exist_ok=True)
    
    # Load JSON data
    try:
        json_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'docs', 'docspace-sdk-js.json')
        print(f"Loading documentation from: {json_path}")
        
        # Verify file exists before attempting to load
        if not os.path.exists(json_path):
            print(f"ERROR: Documentation file not found: {json_path}")
            return False
        
        # Track file size for performance diagnostics
        file_size_mb = os.path.getsize(json_path) / (1024 * 1024)
        print(f"Documentation file size: {file_size_mb:.2f} MB")
        
        # Load JSON data with memory optimization
        start_time = time.time()
        
        # Standard loading for files
        data = load_json(json_path)
        load_time = time.time() - start_time
        print(f"JSON loaded in {load_time:.2f} seconds")
        
        # Memory optimization hint for very large files
        if file_size_mb > 100:
            print("NOTE: For very large files (>100MB), consider installing 'ijson' package")
            print("      for streaming JSON parsing to reduce memory usage.")
        
    except FileNotFoundError:
        print(f"ERROR: File not found: {json_path}")
        return False
    except json.JSONDecodeError as e:
        print(f"ERROR: Invalid JSON in {json_path}: {e}")
        print("Please verify the documentation JSON is properly formatted.")
        return False
    except MemoryError:
        print(f"ERROR: Not enough memory to load documentation file.")
        print("Consider breaking down the documentation into smaller chunks.")
        return False
    except Exception as e:
        print(f"ERROR: Unexpected error loading JSON: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Process documentation
    try:
        # Validate data structure
        if not isinstance(data, dict):
            print(f"ERROR: Invalid TypeDoc JSON format. Expected root object, got {type(data)}")
            return False
            
        if 'children' not in data:
            print(f"ERROR: Invalid TypeDoc JSON format. Missing 'children' array in root object")
            return False
            
        # Log number of elements to process
        children_count = len(data.get('children', []))
        print(f"Found {children_count} top-level documentation elements to process")
        
        # Start processing timer
        start_time = time.time()
        
        # Process the documentation
        process_docs(data, output_path, "SDK")
        
        # Report processing time
        process_time = time.time() - start_time
        print(f"Documentation processed in {process_time:.2f} seconds")
        
        # Report cache statistics
        cache_size = len(_TYPE_EXTRACTION_CACHE)
        print(f"Type extraction cache: {cache_size} entries")
        
        # Report missing examples statistics
        if missing_examples:
            print(f"Found {len(missing_examples)} methods without examples")
            # Optionally save the list for later review
            missing_examples_path = os.path.join(output_path, "missing_examples.txt")
            with open(missing_examples_path, 'w', encoding='utf-8') as f:
                for example in missing_examples:
                    f.write(f"{example}\n")
            print(f"List of methods without examples saved to {missing_examples_path}")
        else:
            print("All methods have examples!")
            
    except Exception as e:
        print(f"ERROR: Documentation generation failed: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    # Report total execution time
    total_time = time.time() - total_start_time
    print(f"Documentation generation completed in {total_time:.2f} seconds")
    print(f"Documentation generated successfully in: {output_path}")
    print('=' * 80)
    
    return True

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
