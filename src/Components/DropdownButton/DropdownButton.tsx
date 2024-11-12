import { useEffect, useState } from 'react';

type DropDownButtonProps = {
  items: string[],
  onItemSelected: (item: string) => void,
  buttonText: string,
  buttonStyle?: string,
};

function DropDownButton({items, onItemSelected, buttonText, buttonStyle}: DropDownButtonProps) {
  const [showDropDown, setShowDropDown] = useState<boolean>(false)

  const toggleDropDown = () => {
    setShowDropDown(!showDropDown)
  }

  useEffect(() => {
    setShowDropDown(showDropDown)
  }, [showDropDown]);

  return (
    <>
      <button className={(showDropDown ? "active" : "") + buttonStyle} onClick={toggleDropDown} onBlur={() => setShowDropDown(false)}>
        <div className={`dropdown ${showDropDown ? "" : "dn"}`}>
          {items.map(
            (item, index) => {
              return (
                <p
                  className='br1'
                  key={index}
                  onClick={(): void => {
                    setShowDropDown(false)
                    onItemSelected(item)
                  }}
                >
                  {item}
                </p>
              );
            }
          )}
        </div>
        {buttonText}
      </button>
      

      
    </>
  );
};

export default DropDownButton
